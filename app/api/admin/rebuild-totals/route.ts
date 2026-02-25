import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || (session.user as any).email;

    // Get all materials with their inventory
    const materials = await prisma.material.findMany({
      include: {
        inventory: true,
        materialTotal: true
      }
    });

    const results: Array<{
      materialId: string;
      name: string;
      previousTotal: number;
      newTotal: number;
      changed: boolean;
    }> = [];

    // Rebuild totals from inventory balances
    for (const material of materials) {
      const previousTotal = material.materialTotal?.totalQty ?? 0;
      const newTotal = material.inventory.reduce((sum, inv) => sum + inv.quantity, 0);

      // Upsert MaterialTotal
      await prisma.materialTotal.upsert({
        where: { materialId: material.id },
        update: { totalQty: newTotal },
        create: {
          materialId: material.id,
          totalQty: newTotal
        }
      });

      results.push({
        materialId: material.id,
        name: material.name,
        previousTotal,
        newTotal,
        changed: previousTotal !== newTotal
      });
    }

    // Create audit log entry (using Transaction table with special type indicator)
    await prisma.transaction.create({
      data: {
        type: "ADJUSTMENT",
        materialId: materials[0]?.id ?? "", // Required field, use first material or empty
        quantity: 0,
        unit: "system",
        userId,
        adjustmentReason: `Admin rebuild totals by ${userName}`,
        notes: JSON.stringify({
          action: "REBUILD_TOTALS",
          timestamp: new Date().toISOString(),
          results: results.filter(r => r.changed)
        })
      }
    });

    const changedCount = results.filter(r => r.changed).length;

    return NextResponse.json({
      success: true,
      message: `Rebuilt totals for ${materials.length} materials. ${changedCount} had discrepancies.`,
      results,
      changedCount
    });
  } catch (error) {
    console.error("Error rebuilding totals:", error);
    return NextResponse.json(
      { error: "Failed to rebuild totals" },
      { status: 500 }
    );
  }
}
