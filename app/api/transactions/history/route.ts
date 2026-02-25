import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get("materialId");
    const locationId = searchParams.get("locationId");
    const type = searchParams.get("type");
    const limit = searchParams.get("limit");

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(materialId && { materialId }),
        ...(locationId && {
          OR: [
            { fromLocationId: locationId },
            { toLocationId: locationId }
          ]
        }),
        ...(type && { type: type as any })
      },
      include: {
        material: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
        fromLocation: true,
        toLocation: true,
        invoicePhotos: true,
        originalTransaction: {
          select: {
            id: true,
            type: true,
            quantity: true,
            date: true
          }
        }
      },
      orderBy: { date: "desc" },
      ...(limit && { take: parseInt(limit) })
    });

    // Format response
    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      type: t.type,
      materialName: t.material.name,
      category: t.material.category,
      quantity: t.quantity,
      unit: t.unit || t.material.unit || 'units',
      fromLocationName: t.fromLocation?.name,
      toLocationName: t.toLocation?.name,
      userName: t.user.name ?? t.user.email,
      date: t.date.toISOString(),
      vendor: t.vendor,
      poNumber: t.poNumber,
      invoiceNumber: t.invoiceNumber,
      notes: t.notes,
      adjustmentReason: t.adjustmentReason,
      originalTransactionId: t.originalTransactionId,
      originalTransaction: t.originalTransaction ? {
        id: t.originalTransaction.id,
        type: t.originalTransaction.type,
        quantity: t.originalTransaction.quantity,
        date: t.originalTransaction.date.toISOString()
      } : null,
      invoicePhotos: t.invoicePhotos.map(p => ({
        id: p.id,
        cloud_storage_path: p.cloud_storage_path,
        isPublic: p.isPublic
      }))
    }));

    return NextResponse.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction history" },
      { status: 500 }
    );
  }
}
