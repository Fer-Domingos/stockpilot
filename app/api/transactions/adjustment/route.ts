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
    const { materialId, locationId, quantityDelta, reason, originalTransactionId } = body;

    if (!materialId || !locationId || quantityDelta === undefined || quantityDelta === 0) {
      return NextResponse.json(
        { error: "Material, location, and non-zero quantity delta are required" },
        { status: 400 }
      );
    }

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: "Adjustment reason is required" },
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

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Verify original transaction if provided
    if (originalTransactionId) {
      const originalTransaction = await prisma.transaction.findUnique({
        where: { id: originalTransactionId }
      });

      if (!originalTransaction) {
        return NextResponse.json(
          { error: "Original transaction not found" },
          { status: 404 }
        );
      }
    }

    // Create adjustment transaction and update inventory
    const result = await prisma.$transaction(async (tx) => {
      // Check current inventory
      const existingInventory = await tx.inventory.findUnique({
        where: {
          materialId_locationId: {
            materialId,
            locationId
          }
        }
      });

      const currentQuantity = existingInventory?.quantity || 0;
      const newQuantity = currentQuantity + quantityDelta;

      // Don't allow negative inventory
      if (newQuantity < 0) {
        throw new Error(`Cannot adjust below zero. Current stock: ${currentQuantity}, adjustment: ${quantityDelta}`);
      }

      // Create adjustment transaction
      const transaction = await tx.transaction.create({
        data: {
          type: TransactionType.ADJUSTMENT,
          materialId,
          quantity: quantityDelta,
          unit: material.unit,
          fromLocationId: quantityDelta < 0 ? locationId : null,
          toLocationId: quantityDelta > 0 ? locationId : null,
          userId: (session.user as any).id,
          adjustmentReason: reason.trim(),
          originalTransactionId: originalTransactionId || null,
          notes: originalTransactionId ? `Adjustment for transaction ${originalTransactionId}` : null
        }
      });

      // Update inventory
      if (existingInventory) {
        await tx.inventory.update({
          where: { id: existingInventory.id },
          data: { quantity: newQuantity }
        });
      } else if (quantityDelta > 0) {
        // Only create inventory if adding stock
        await tx.inventory.create({
          data: {
            materialId,
            locationId,
            quantity: quantityDelta
          }
        });
      }

      // Update MaterialTotal (apply delta change)
      if (quantityDelta > 0) {
        await tx.materialTotal.upsert({
          where: { materialId },
          update: { totalQty: { increment: quantityDelta } },
          create: { materialId, totalQty: quantityDelta }
        });
      } else {
        await tx.materialTotal.upsert({
          where: { materialId },
          update: { totalQty: { decrement: Math.abs(quantityDelta) } },
          create: { materialId, totalQty: 0 }
        });
      }

      return transaction;
    });

    return NextResponse.json({ transaction: result }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating adjustment:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create adjustment" },
      { status: 500 }
    );
  }
}
