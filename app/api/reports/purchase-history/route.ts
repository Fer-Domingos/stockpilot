import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all RECEIVE transactions
    const receiveTransactions = await prisma.transaction.findMany({
      where: {
        type: "RECEIVE",
        vendor: { not: null }
      },
      include: {
        material: true
      },
      orderBy: { date: "desc" }
    });

    // Group by vendor
    const purchasesByVendor: Record<string, any> = {};

    receiveTransactions.forEach(t => {
      const vendor = t.vendor ?? "Unknown";
      if (!purchasesByVendor[vendor]) {
        purchasesByVendor[vendor] = {
          vendor,
          purchases: []
        };
      }

      purchasesByVendor[vendor].purchases.push({
        date: t.date.toISOString(),
        materialName: t.material.name,
        quantity: t.quantity,
        poNumber: t.poNumber,
        invoiceNumber: t.invoiceNumber
      });
    });

    const report = Object.values(purchasesByVendor);

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error generating purchase history report:", error);
    return NextResponse.json(
      { error: "Failed to generate purchase history report" },
      { status: 500 }
    );
  }
}
