import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { TransactionType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === "Viewer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { materialId, quantity, fromLocationId, notes } = body;

    if (!materialId || !quantity || quantity <= 0 || !fromLocationId) {
      return NextResponse.json(
        { error: "Material, valid quantity, and source location are required" },
        { status: 400 }
      );
    }

    // Verify source location exists and is a JOB
    const fromLocation = await prisma.location.findUnique({
      where: { id: fromLocationId }
    });

    if (!fromLocation || fromLocation.type !== "JOB") {
      return NextResponse.json(
        { error: "Invalid source location" },
        { status: 400 }
      );
    }

    // Get material to retrieve unit
    const material = await prisma.material.findUnique({
      where: { id: materialId }
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    // Create transaction and update inventory
    const result = await prisma.$transaction(async (tx) => {
      // Check JOB inventory
      const jobInventory = await tx.inventory.findUnique({
        where: {
          materialId_locationId: {
            materialId,
            locationId: fromLocationId
          }
        }
      });

      if (!jobInventory || jobInventory.quantity < quantity) {
        throw new Error("Insufficient inventory at JOB location");
      }

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          type: TransactionType.ISSUE,
          materialId,
          quantity,
          unit: material.unit,
          fromLocationId,
          userId: (session.user as any).id,
          notes
        }
      });

      // Update JOB inventory
      await tx.inventory.update({
        where: { id: jobInventory.id },
        data: { quantity: jobInventory.quantity - quantity }
      });

      // Update MaterialTotal (decrease total stock)
      await tx.materialTotal.upsert({
        where: { materialId },
        update: { totalQty: { decrement: quantity } },
        create: { materialId, totalQty: 0 }
      });

      return transaction;
    });

    return NextResponse.json({ transaction: result }, { status: 201 });
  } catch (error: any) {
    console.error("Error issuing material:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to issue material" },
      { status: 500 }
    );
  }
}
