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
    const { materialId, quantity, toLocationId, notes } = body;

    if (!materialId || !quantity || quantity <= 0 || !toLocationId) {
      return NextResponse.json(
        { error: "Material, valid quantity, and destination location are required" },
        { status: 400 }
      );
    }

    // Find SHOP location
    const shopLocation = await prisma.location.findFirst({
      where: { type: "SHOP" }
    });

    if (!shopLocation) {
      return NextResponse.json(
        { error: "SHOP location not found" },
        { status: 404 }
      );
    }

    // Verify destination location exists and is a JOB
    const toLocation = await prisma.location.findUnique({
      where: { id: toLocationId }
    });

    if (!toLocation || toLocation.type !== "JOB") {
      return NextResponse.json(
        { error: "Invalid destination location" },
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
      // Check SHOP inventory
      const shopInventory = await tx.inventory.findUnique({
        where: {
          materialId_locationId: {
            materialId,
            locationId: shopLocation.id
          }
        }
      });

      if (!shopInventory || shopInventory.quantity < quantity) {
        throw new Error("Insufficient inventory in SHOP");
      }

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          type: TransactionType.TRANSFER,
          materialId,
          quantity,
          unit: material.unit,
          fromLocationId: shopLocation.id,
          toLocationId,
          userId: (session.user as any).id,
          notes
        }
      });

      // Update SHOP inventory
      await tx.inventory.update({
        where: { id: shopInventory.id },
        data: { quantity: shopInventory.quantity - quantity }
      });

      // Update or create JOB inventory
      const jobInventory = await tx.inventory.findUnique({
        where: {
          materialId_locationId: {
            materialId,
            locationId: toLocationId
          }
        }
      });

      if (jobInventory) {
        await tx.inventory.update({
          where: { id: jobInventory.id },
          data: { quantity: jobInventory.quantity + quantity }
        });
      } else {
        await tx.inventory.create({
          data: {
            materialId,
            locationId: toLocationId,
            quantity
          }
        });
      }

      return transaction;
    });

    return NextResponse.json({ transaction: result }, { status: 201 });
  } catch (error: any) {
    console.error("Error transferring material:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to transfer material" },
      { status: 500 }
    );
  }
}
