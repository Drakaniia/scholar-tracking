import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateNamesToUppercase() {
    console.log('🔄 Updating all names to uppercase...');

    // Get all students
    const students = await prisma.student.findMany();
    
    // Update each student
    for (const student of students) {
        await prisma.student.update({
            where: { id: student.id },
            data: {
                firstName: student.firstName.toUpperCase(),
                lastName: student.lastName.toUpperCase(),
                middleInitial: student.middleInitial ? student.middleInitial.toUpperCase() : null,
            },
        });
    }

    console.log(`✅ Updated ${students.length} students`);

    // Get all users
    const users = await prisma.user.findMany();
    
    // Update each user
    for (const user of users) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                firstName: user.firstName.toUpperCase(),
                lastName: user.lastName.toUpperCase(),
            },
        });
    }

    console.log(`✅ Updated ${users.length} users`);
    console.log('🎉 All names updated to uppercase!');
}

updateNamesToUppercase()
    .catch((e) => {
        console.error('❌ Update failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
