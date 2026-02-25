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

    const inventory = await prisma.inventory.findMany({
      include: {
        material: true,
        location: true
      },
      orderBy: [
        { location: { name: "asc" } },
        { material: { name: "asc" } }
      ]
    });

    const report = inventory.map(item => ({
      location: item.location.name,
      locationType: item.location.type,
      material: item.material.name,
      category: item.material.category,
      quantity: item.quantity,
      minStockLevel: item.material.minStockLevel,
      status: item.quantity < item.material.minStockLevel ? "Low Stock" : "OK"
    }));

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error generating inventory report:", error);
    return NextResponse.json(
      { error: "Failed to generate inventory report" },
      { status: 500 }
    );
  }
}
