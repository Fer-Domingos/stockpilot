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

    // Get total materials count
    const totalMaterials = await prisma.material.count();

    // Get low stock items count
    const allInventory = await prisma.inventory.findMany({
      include: {
        material: true
      }
    });
    const lowStockItems = allInventory.filter(
      item => item.quantity < item.material.minStockLevel
    ).length;

    // Get active jobs count
    const activeJobs = await prisma.location.count({
      where: {
        type: "JOB",
        isActive: true
      }
    });

    // Get total locations count
    const totalLocations = await prisma.location.count();

    // Get inventory by category
    const materials = await prisma.material.findMany({
      include: {
        inventory: true
      }
    });

    const inventoryByCategory: Record<string, number> = {};
    materials.forEach(material => {
      const totalQty = material.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      inventoryByCategory[material.category] = (inventoryByCategory[material.category] ?? 0) + totalQty;
    });

    // Get inventory by location
    const locations = await prisma.location.findMany({
      include: {
        inventory: true
      }
    });

    const inventoryByLocation = locations.map(loc => ({
      name: loc.name,
      type: loc.type,
      totalItems: loc.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
    }));

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: {
        material: true,
        user: {
          select: { name: true, email: true }
        },
        fromLocation: true,
        toLocation: true
      }
    });

    const formattedRecent = recentTransactions.map(t => ({
      id: t.id,
      type: t.type,
      materialName: t.material.name,
      quantity: t.quantity,
      fromLocationName: t.fromLocation?.name,
      toLocationName: t.toLocation?.name,
      userName: t.user.name ?? t.user.email,
      date: t.date.toISOString()
    }));

    return NextResponse.json({
      stats: {
        totalMaterials,
        lowStockItems,
        activeJobs,
        totalLocations
      },
      inventoryByCategory,
      inventoryByLocation,
      recentTransactions: formattedRecent
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
