import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { generateToken, getInviteExpiry } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.isActive) {
      return NextResponse.json(
        { error: "User is already active" },
        { status: 400 }
      );
    }

    // Generate new invite token
    const inviteToken = generateToken();
    const inviteExpires = getInviteExpiry();

    // Update user with new invite token
    await prisma.user.update({
      where: { id: userId },
      data: {
        inviteToken,
        inviteExpires
      }
    });

    // Send invite email
    await sendInviteEmail(user.email, inviteToken, user.name);

    return NextResponse.json({ success: true, message: "Invite email sent" });
  } catch (error) {
    console.error("Error resending invite:", error);
    return NextResponse.json(
      { error: "Failed to resend invite" },
      { status: 500 }
    );
  }
}
