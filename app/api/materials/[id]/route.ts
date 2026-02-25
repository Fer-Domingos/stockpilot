import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { MaterialCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === "Viewer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, category, unit, minStockLevel } = body;

    const allowedUnits = ['sheets', 'pcs', 'unit', 'tube', 'box'];
    const updateData: any = {};
    if (name) updateData.name = name;
    if (category) updateData.category = category as MaterialCategory;
    if (unit && allowedUnits.includes(unit)) updateData.unit = unit;
    if (minStockLevel !== undefined) updateData.minStockLevel = minStockLevel;

    const material = await prisma.material.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json({ material });
  } catch (error) {
    console.error("Error updating material:", error);
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.material.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting material:", error);
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 }
    );
  }
}
