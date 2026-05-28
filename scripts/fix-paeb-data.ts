import 'dotenv/config';

import prisma from '../src/lib/prisma';

async function main() {
  const [renamedScholarships, normalizedTypes] = await prisma.$transaction([
    prisma.scholarship.updateMany({
      where: {
        scholarshipName: {
          contains: 'Private Education Assistance for Basic Education',
        },
      },
      data: {
        scholarshipName: 'Parents Association Executive Board (PAEB) (GS/JHS)',
        sponsor: 'Parents Association Executive Board',
        type: 'PAEB',
      },
    }),
    prisma.scholarship.updateMany({
      where: {
        type: 'PAED',
      },
      data: {
        type: 'PAEB',
      },
    }),
  ]);

  console.log(
    `Updated ${renamedScholarships.count} PAEB scholarship name(s) and ${normalizedTypes.count} PAED type value(s).`
  );
}

main()
  .catch((error) => {
    console.error('Failed to fix PAEB data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
