import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateToken, getResetExpiry } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

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

    // Generate reset token
    const resetToken = generateToken();
    const resetExpires = getResetExpiry();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpires
      }
    });

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken, user.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending password reset:", error);
    return NextResponse.json(
      { error: "Failed to send password reset email" },
      { status: 500 }
    );
  }
}
