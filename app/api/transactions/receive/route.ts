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
    const { materialId, quantity, vendor, poNumber, invoiceNumber, notes, invoicePhotos } = body;

    if (!materialId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Material and valid quantity are required" },
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

    // Create transaction and update inventory in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          type: TransactionType.RECEIVE,
          materialId,
          quantity,
          unit: material.unit,
          toLocationId: shopLocation.id,
          userId: (session.user as any).id,
          vendor,
          poNumber,
          invoiceNumber,
          notes
        }
      });

      // Update or create inventory record
      const existingInventory = await tx.inventory.findUnique({
        where: {
          materialId_locationId: {
            materialId,
            locationId: shopLocation.id
          }
        }
      });

      if (existingInventory) {
        await tx.inventory.update({
          where: { id: existingInventory.id },
          data: { quantity: existingInventory.quantity + quantity }
        });
      } else {
        await tx.inventory.create({
          data: {
            materialId,
            locationId: shopLocation.id,
            quantity
          }
        });
      }

      // Create invoice photo records if provided
      if (invoicePhotos && Array.isArray(invoicePhotos) && invoicePhotos.length > 0) {
        await tx.invoicePhoto.createMany({
          data: invoicePhotos.map((photo: any) => ({
            transactionId: transaction.id,
            cloud_storage_path: photo.cloud_storage_path,
            isPublic: photo.isPublic ?? false
          }))
        });
      }

      // Update MaterialTotal (single source of truth for total stock)
      await tx.materialTotal.upsert({
        where: { materialId },
        update: { totalQty: { increment: quantity } },
        create: { materialId, totalQty: quantity }
      });

      return transaction;
    });

    return NextResponse.json({ transaction: result }, { status: 201 });
  } catch (error) {
    console.error("Error receiving material:", error);
    return NextResponse.json(
      { error: "Failed to receive material" },
      { status: 500 }
    );
  }
}
