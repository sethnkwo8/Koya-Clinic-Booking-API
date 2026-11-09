import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.slot.count();
  if (count > 0) {
    console.log("Slots already exist, skipping seed.");
    return;
  }

  const base = new Date();
  base.setUTCDate(base.getUTCDate() + 7);
  base.setUTCHours(9, 0, 0, 0);

  const slots = [
    {
      id: "s1",
      provider: "Dr Ade",
      start: new Date(base),
      end: new Date(base.getTime() + 30 * 60 * 1000),
    },
    {
      id: "s2",
      provider: "Dr Ade",
      start: new Date(base.getTime() + 60 * 60 * 1000),
      end: new Date(base.getTime() + 90 * 60 * 1000),
    },
    {
      id: "s3",
      provider: "Dr Bola",
      start: new Date(base.getTime() + 2 * 60 * 60 * 1000),
      end: new Date(base.getTime() + 150 * 60 * 1000),
    },
  ];

  await prisma.slot.createMany({ data: slots });
  console.log(`Seeded ${slots.length} demo slots.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
