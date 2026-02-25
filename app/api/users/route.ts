import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { generateToken, getInviteExpiry } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        inviteExpires: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, role } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Generate invite token
    const inviteToken = generateToken();
    const inviteExpires = getInviteExpiry();

    // Create user with invite token (no password yet)
    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        role: (role as UserRole) ?? UserRole.Viewer,
        isActive: false,
        inviteToken,
        inviteExpires
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        inviteExpires: true,
        createdAt: true
      }
    });

    // Send invite email
    try {
      await sendInviteEmail(email, inviteToken, name);
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
      // User is created but email failed - admin can resend
    }

    return NextResponse.json({ user, inviteSent: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
