import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// Verify invite token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        name: true,
        inviteExpires: true,
        isActive: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid invite link" },
        { status: 400 }
      );
    }

    if (user.isActive) {
      return NextResponse.json(
        { error: "This account has already been activated" },
        { status: 400 }
      );
    }

    if (user.inviteExpires && new Date() > user.inviteExpires) {
      return NextResponse.json(
        { error: "This invite link has expired. Please contact your administrator for a new invite." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error("Error verifying invite:", error);
    return NextResponse.json(
      { error: "Failed to verify invite" },
      { status: 500 }
    );
  }
}

// Set password and activate account
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password, name } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid invite link" },
        { status: 400 }
      );
    }

    if (user.isActive) {
      return NextResponse.json(
        { error: "This account has already been activated" },
        { status: 400 }
      );
    }

    if (user.inviteExpires && new Date() > user.inviteExpires) {
      return NextResponse.json(
        { error: "This invite link has expired" },
        { status: 400 }
      );
    }

    // Hash password and activate account
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        name: name || user.name,
        isActive: true,
        inviteToken: null,
        inviteExpires: null
      }
    });

    return NextResponse.json({ success: true, message: "Account activated successfully" });
  } catch (error) {
    console.error("Error activating account:", error);
    return NextResponse.json(
      { error: "Failed to activate account" },
      { status: 500 }
    );
  }
}
