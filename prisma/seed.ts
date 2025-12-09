import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create built-in maintenance templates
  const templates = [
    {
      name: 'Oil Change',
      description: 'Regular engine oil and filter replacement',
      intervalMonths: 3,
      intervalMiles: 3000,
      checklistItems: [
        'Drain old oil',
        'Replace oil filter',
        'Add new oil',
        'Check oil level',
        'Reset maintenance reminder'
      ],
      isBuiltIn: true,
    },
    {
      name: 'Tire Rotation',
      description: 'Rotate tires to ensure even wear',
      intervalMonths: 6,
      intervalMiles: 6000,
      checklistItems: [
        'Check tire pressure',
        'Rotate tires',
        'Inspect for wear',
        'Check alignment'
      ],
      isBuiltIn: true,
    },
    {
      name: 'Brake Inspection',
      description: 'Inspect brake pads, rotors, and fluid',
      intervalMonths: 6,
      intervalMiles: 10000,
      checklistItems: [
        'Inspect brake pads',
        'Check brake fluid level',
        'Inspect rotors',
        'Test brake function'
      ],
      isBuiltIn: true,
    },
    {
      name: 'Battery Check',
      description: 'Test battery voltage and connections',
      intervalMonths: 12,
      intervalMiles: null,
      checklistItems: [
        'Test battery voltage',
        'Check terminals for corrosion',
        'Inspect battery case',
        'Test charging system'
      ],
      isBuiltIn: true,
    },
    {
      name: 'Fluid Top-Off',
      description: 'Check and top off all vehicle fluids',
      intervalMonths: 3,
      intervalMiles: null,
      checklistItems: [
        'Check engine oil',
        'Check coolant',
        'Check transmission fluid',
        'Check brake fluid',
        'Check power steering fluid',
        'Check windshield washer fluid'
      ],
      isBuiltIn: true,
    },
  ]

  for (const template of templates) {
    // Check if template already exists by name (for built-in templates)
    const existing = await prisma.maintenanceTemplate.findFirst({
      where: {
        name: template.name,
        isBuiltIn: true,
      },
    })

    if (!existing) {
      await prisma.maintenanceTemplate.create({
        data: template,
      })
    }
  }

  console.log('Seeded built-in maintenance templates')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

