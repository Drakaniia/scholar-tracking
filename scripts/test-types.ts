import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const scholarship = await prisma.scholarship.findFirst();
  console.log(scholarship?.eligiblePrograms);
}

test();