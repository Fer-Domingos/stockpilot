import { prisma } from '../lib/db';

async function initializeMaterialTotals() {
  console.log('Initializing MaterialTotal table from inventory balances...');

  try {
    // Get all materials
    const materials = await prisma.material.findMany({
      include: {
        inventory: true
      }
    });

    console.log(`Found ${materials.length} materials`);

    for (const material of materials) {
      // Calculate total from inventory balances
      const totalQty = material.inventory.reduce((sum, inv) => sum + inv.quantity, 0);

      // Upsert MaterialTotal
      await prisma.materialTotal.upsert({
        where: { materialId: material.id },
        update: { totalQty },
        create: {
          materialId: material.id,
          totalQty
        }
      });

      console.log(`  ${material.name}: ${totalQty} ${material.unit}`);
    }

    console.log('MaterialTotal initialization complete!');
  } catch (error) {
    console.error('Error initializing MaterialTotal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initializeMaterialTotals();
