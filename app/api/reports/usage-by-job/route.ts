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

    // Get all ISSUE transactions grouped by job
    const issueTransactions = await prisma.transaction.findMany({
      where: { type: "ISSUE" },
      include: {
        material: true,
        fromLocation: true
      }
    });

    // Group by job location
    const usageByJob: Record<string, any> = {};

    issueTransactions.forEach(t => {
      const jobName = t.fromLocation?.name ?? "Unknown";
      if (!usageByJob[jobName]) {
        usageByJob[jobName] = {
          jobName,
          materials: {}
        };
      }

      const materialKey = t.material.name;
      if (!usageByJob[jobName].materials[materialKey]) {
        usageByJob[jobName].materials[materialKey] = {
          materialName: t.material.name,
          category: t.material.category,
          totalQuantity: 0
        };
      }

      usageByJob[jobName].materials[materialKey].totalQuantity += t.quantity;
    });

    // Convert to array format
    const report = Object.values(usageByJob).map((job: any) => ({
      jobName: job.jobName,
      materials: Object.values(job.materials)
    }));

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error generating usage by job report:", error);
    return NextResponse.json(
      { error: "Failed to generate usage by job report" },
      { status: 500 }
    );
  }
}
