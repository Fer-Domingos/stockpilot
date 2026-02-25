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
    const locationId = searchParams.get("locationId");
    const materialId = searchParams.get("materialId");
    const category = searchParams.get("category");
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const inventory = await prisma.inventory.findMany({
      where: {
        ...(locationId && { locationId }),
        ...(materialId && { materialId }),
        ...(category && { material: { category: category as any } })
      },
      include: {
        material: true,
        location: true
      },
      orderBy: [
        { location: { name: "asc" } },
        { material: { name: "asc" } }
      ]
    });

    // Filter for low stock if requested
    const filteredInventory = lowStockOnly
      ? inventory.filter(item => item.quantity < item.material.minStockLevel)
      : inventory;

    // Format response
    const formattedInventory = filteredInventory.map(item => ({
      id: item.id,
      materialId: item.materialId,
      materialName: item.material.name,
      category: item.material.category,
      locationId: item.locationId,
      locationName: item.location.name,
      locationType: item.location.type,
      quantity: item.quantity,
      minStockLevel: item.material.minStockLevel,
      isLowStock: item.quantity < item.material.minStockLevel
    }));

    return NextResponse.json({ inventory: formattedInventory });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
