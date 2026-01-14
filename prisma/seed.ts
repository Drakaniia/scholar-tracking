import { PrismaClient, Prisma } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL,
});

async function main() {
    console.log('🌱 Starting seed...');

    // Clear existing data (in reverse order of dependencies)
    await prisma.disbursement.deleteMany();
    await prisma.award.deleteMany();
    await prisma.application.deleteMany();
    await prisma.student.deleteMany();
    await prisma.scholarship.deleteMany();

    // Create Students
    const students = await Promise.all([
        prisma.student.create({
            data: {
                studentNo: 'STU-2024-001',
                fullName: 'Juan Santos Dela Cruz',
                program: 'Bachelor of Science in Computer Science',
                yearLevel: '3rd Year',
                email: 'juan.delacruz@email.com',
                status: 'Active',
            },
        }),
        prisma.student.create({
            data: {
                studentNo: 'STU-2024-002',
                fullName: 'Maria Garcia Reyes',
                program: 'Bachelor of Science in Nursing',
                yearLevel: '2nd Year',
                email: 'maria.reyes@email.com',
                status: 'Active',
            },
        }),
        prisma.student.create({
            data: {
                studentNo: 'STU-2024-003',
                fullName: 'Pedro Santos',
                program: 'Bachelor of Science in Information Technology',
                yearLevel: '4th Year',
                email: 'pedro.santos@email.com',
                status: 'Active',
            },
        }),
        prisma.student.create({
            data: {
                studentNo: 'STU-2024-004',
                fullName: 'Ana Lopez Gonzales',
                program: 'Bachelor of Science in Business Administration',
                yearLevel: '1st Year',
                email: 'ana.gonzales@email.com',
                status: 'Active',
            },
        }),
    ]);

    console.log(`✅ Created ${students.length} students`);

    // Create Scholarships
    const scholarships = await Promise.all([
        prisma.scholarship.create({
            data: {
                scholarshipName: 'Academic Excellence Award',
                sponsor: 'University Foundation',
                type: 'Internal',
                amount: new Prisma.Decimal(15000),
                requirements: 'Minimum GWA of 1.5',
                status: 'Active',
            },
        }),
        prisma.scholarship.create({
            data: {
                scholarshipName: 'Financial Assistance Program',
                sponsor: 'Alumni Association',
                type: 'Internal',
                amount: new Prisma.Decimal(10000),
                requirements: 'Family income below poverty threshold',
                status: 'Active',
            },
        }),
        prisma.scholarship.create({
            data: {
                scholarshipName: 'CHED Merit Scholarship',
                sponsor: 'Commission on Higher Education',
                type: 'External',
                amount: new Prisma.Decimal(30000),
                requirements: 'Top 10% of graduating class',
                status: 'Active',
            },
        }),
        prisma.scholarship.create({
            data: {
                scholarshipName: 'City Government Scholarship',
                sponsor: 'Local Government Unit',
                type: 'External',
                amount: new Prisma.Decimal(15000),
                requirements: 'Resident of the city for at least 3 years',
                status: 'Active',
            },
        }),
    ]);

    console.log(`✅ Created ${scholarships.length} scholarships`);

    // Create Applications
    const applications = await Promise.all([
        prisma.application.create({
            data: {
                applicationDate: new Date('2025-06-01'),
                status: 'Approved',
                remarks: 'Excellent academic record',
                studentId: students[0].id,
                scholarshipId: scholarships[0].id,
            },
        }),
        prisma.application.create({
            data: {
                applicationDate: new Date('2025-06-15'),
                status: 'Pending',
                studentId: students[0].id,
                scholarshipId: scholarships[2].id,
            },
        }),
        prisma.application.create({
            data: {
                applicationDate: new Date('2025-07-01'),
                status: 'Approved',
                studentId: students[1].id,
                scholarshipId: scholarships[1].id,
            },
        }),
        prisma.application.create({
            data: {
                applicationDate: new Date('2025-07-10'),
                status: 'Approved',
                studentId: students[2].id,
                scholarshipId: scholarships[2].id,
            },
        }),
        prisma.application.create({
            data: {
                applicationDate: new Date('2025-08-01'),
                status: 'Rejected',
                remarks: 'Incomplete requirements',
                studentId: students[3].id,
                scholarshipId: scholarships[3].id,
            },
        }),
    ]);

    console.log(`✅ Created ${applications.length} applications`);

    // Create Awards (for approved applications)
    const awards = await Promise.all([
        prisma.award.create({
            data: {
                awardDate: new Date('2025-06-15'),
                startTerm: '1st Semester 2025-2026',
                endTerm: '2nd Semester 2025-2026',
                grantAmount: new Prisma.Decimal(15000),
                applicationId: applications[0].id,
            },
        }),
        prisma.award.create({
            data: {
                awardDate: new Date('2025-07-15'),
                startTerm: '1st Semester 2025-2026',
                endTerm: '2nd Semester 2025-2026',
                grantAmount: new Prisma.Decimal(10000),
                applicationId: applications[2].id,
            },
        }),
        prisma.award.create({
            data: {
                awardDate: new Date('2025-07-20'),
                startTerm: '1st Semester 2025-2026',
                endTerm: '2nd Semester 2026-2027',
                grantAmount: new Prisma.Decimal(30000),
                applicationId: applications[3].id,
            },
        }),
    ]);

    console.log(`✅ Created ${awards.length} awards`);

    // Create Disbursements
    const disbursements = await Promise.all([
        prisma.disbursement.create({
            data: {
                disbursementDate: new Date('2025-08-01'),
                amount: new Prisma.Decimal(7500),
                term: '1st Semester 2025-2026',
                method: 'Bank Transfer',
                awardId: awards[0].id,
            },
        }),
        prisma.disbursement.create({
            data: {
                disbursementDate: new Date('2026-01-05'),
                amount: new Prisma.Decimal(7500),
                term: '2nd Semester 2025-2026',
                method: 'Bank Transfer',
                awardId: awards[0].id,
            },
        }),
        prisma.disbursement.create({
            data: {
                disbursementDate: new Date('2025-08-01'),
                amount: new Prisma.Decimal(5000),
                term: '1st Semester 2025-2026',
                method: 'Check',
                awardId: awards[1].id,
            },
        }),
        prisma.disbursement.create({
            data: {
                disbursementDate: new Date('2025-08-15'),
                amount: new Prisma.Decimal(15000),
                term: '1st Semester 2025-2026',
                method: 'Bank Transfer',
                awardId: awards[2].id,
            },
        }),
    ]);

    console.log(`✅ Created ${disbursements.length} disbursements`);
    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
