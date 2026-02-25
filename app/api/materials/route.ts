import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { MaterialCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const materials = await prisma.material.findMany({
      where: category ? { category: category as MaterialCategory } : {},
      orderBy: { name: "asc" },
      include: {
        inventory: {
          include: {
            location: true
          }
        },
        materialTotal: true
      }
    });

    // Format response with totalQty from MaterialTotal (single source of truth)
    const formattedMaterials = materials.map(m => ({
      ...m,
      totalStock: m.materialTotal?.totalQty ?? 0
    }));

    return NextResponse.json({ materials: formattedMaterials });
  } catch (error) {
    console.error("Error fetching materials:", error);
    return NextResponse.json(
      { error: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === "Viewer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, category, unit, minStockLevel } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    const allowedUnits = ['sheets', 'pcs', 'unit', 'tube', 'box'];
    const materialUnit = allowedUnits.includes(unit) ? unit : 'sheets';

    const material = await prisma.material.create({
      data: {
        name,
        category: category as MaterialCategory,
        unit: materialUnit,
        minStockLevel: minStockLevel ?? 0,
        // Initialize MaterialTotal with 0 stock for new materials
        materialTotal: {
          create: {
            totalQty: 0
          }
        }
      },
      include: {
        materialTotal: true
      }
    });

    return NextResponse.json({ 
      material: {
        ...material,
        totalStock: material.materialTotal?.totalQty ?? 0
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating material:", error);
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
}
