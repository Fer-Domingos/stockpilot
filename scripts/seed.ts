import { PrismaClient, UserRole, MaterialCategory, LocationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create users
  console.log('Creating users...');
  
  // Default test account
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: await bcrypt.hash('johndoe123', 10),
      name: 'John Doe',
      role: UserRole.Admin
    }
  });

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cabinetshop.com' },
    update: {},
    create: {
      email: 'admin@cabinetshop.com',
      password: await bcrypt.hash('Admin@123', 10),
      name: 'Shop Administrator',
      role: UserRole.Admin
    }
  });

  // Create locations
  console.log('Creating locations...');
  const shopLocation = await prisma.location.upsert({
    where: { name: 'SHOP' },
    update: {},
    create: {
      name: 'SHOP',
      type: LocationType.SHOP,
      isActive: true
    }
  });

  const job1 = await prisma.location.upsert({
    where: { name: '6-2523' },
    update: {},
    create: {
      name: '6-2523',
      type: LocationType.JOB,
      isActive: true
    }
  });

  const job2 = await prisma.location.upsert({
    where: { name: '6-2524' },
    update: {},
    create: {
      name: '6-2524',
      type: LocationType.JOB,
      isActive: true
    }
  });

  // Create materials
  console.log('Creating materials...');
  const materials = [
    { name: 'Oak Plywood 3/4"', category: MaterialCategory.WoodSheets, minStockLevel: 20 },
    { name: 'Maple Plywood 1/2"', category: MaterialCategory.WoodSheets, minStockLevel: 15 },
    { name: 'Cabinet Handles - Brushed Nickel', category: MaterialCategory.Hardware, minStockLevel: 50 },
    { name: 'Drawer Pulls - Black', category: MaterialCategory.Hardware, minStockLevel: 40 },
    { name: 'Soft-Close Hinges', category: MaterialCategory.Hinges, minStockLevel: 100 },
    { name: 'Full Extension Drawer Slides', category: MaterialCategory.Slides, minStockLevel: 60 },
    { name: 'Wood Glue', category: MaterialCategory.Other, minStockLevel: 10 },
    { name: 'Cabinet Screws 1.25"', category: MaterialCategory.Hardware, minStockLevel: 500 }
  ];

  for (const material of materials) {
    await prisma.material.upsert({
      where: { name: material.name },
      update: {},
      create: material
    });
  }

  // Get all materials
  const allMaterials = await prisma.material.findMany();

  // Create initial inventory in SHOP
  console.log('Creating initial inventory...');
  for (const material of allMaterials) {
    await prisma.inventory.upsert({
      where: {
        materialId_locationId: {
          materialId: material.id,
          locationId: shopLocation.id
        }
      },
      update: {},
      create: {
        materialId: material.id,
        locationId: shopLocation.id,
        quantity: Math.floor(Math.random() * 50) + material.minStockLevel
      }
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
