import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateToken, getMagicLinkExpiry } from "@/lib/tokens";
import { sendMagicLinkEmail } from "@/lib/email";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

// Request magic link
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      return NextResponse.json({ success: true });
    }

    // Generate magic link token using JWT
    const magicToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '15m' }
    );

    // Send magic link email
    await sendMagicLinkEmail(email, magicToken, user.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending magic link:", error);
    return NextResponse.json(
      { error: "Failed to send magic link" },
      { status: 500 }
    );
  }
}

// Verify magic link and redirect
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

    if (!token) {
      return NextResponse.redirect(`${appUrl}/login?error=InvalidToken`);
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    } catch (err) {
      return NextResponse.redirect(`${appUrl}/login?error=ExpiredToken`);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      return NextResponse.redirect(`${appUrl}/login?error=InvalidUser`);
    }

    // Create a session token for auto-login
    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '1h' }
    );

    // Redirect to magic-link callback page
    return NextResponse.redirect(`${appUrl}/auth/magic-callback?session=${sessionToken}`);
  } catch (error) {
    console.error("Error verifying magic link:", error);
    const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/login?error=ServerError`);
  }
}
