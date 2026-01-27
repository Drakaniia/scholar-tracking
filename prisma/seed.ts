import { PrismaClient, Prisma } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Clear existing data (in reverse order of dependencies)
    await prisma.disbursement.deleteMany();
    await prisma.studentFees.deleteMany();
    await prisma.student.deleteMany();
    await prisma.scholarship.deleteMany();

    // Create Students with separated name fields and grade levels
    const students = await Promise.all([
        // COLLEGE Students
        prisma.student.create({
            data: {
                studentNo: 'STU-2024-001',
                lastName: 'Dela Cruz',
                firstName: 'Juan',
                middleInitial: 'S',
                program: 'Bachelor of Science in Computer Science',
                gradeLevel: 'COLLEGE',
                yearLevel: '3rd Year',
                status: 'Active',
            },
        }),
        prisma.student.create({
            data: {
                studentNo: 'STU-2024-002',
                lastName: 'Reyes',
                firstName: 'Maria',
                middleInitial: 'G',
                program: 'Bachelor of Science in Nursing',
                gradeLevel: 'COLLEGE',
                yearLevel: '2nd Year',
                status: 'Active',
            },
        }),
        prisma.student.create({
            data: {
                studentNo: 'STU-2024-003',
                lastName: 'Santos',
                firstName: 'Pedro',
                middleInitial: null,
                program: 'Bachelor of Science in Information Technology',
                gradeLevel: 'COLLEGE',
                yearLevel: '4th Year',
                status: 'Active',
            },
        }),
        // SENIOR HIGH Students
        prisma.student.create({
            data: {
                studentNo: 'STU-2024-004',
                lastName: 'Gonzales',
                firstName: 'Ana',
                middleInitial: 'L',
                program: 'STEM',
                gradeLevel: 'SENIOR_HIGH',
                yearLevel: 'Grade 11',
                status: 'Active',
            },
        }),
        // JUNIOR HIGH Students
        prisma.student.create({
            data: {
                studentNo: 'STU-2024-005',
                lastName: 'Ramos',
                firstName: 'Carlos',
                middleInitial: 'M',
                program: 'General Education',
                gradeLevel: 'JUNIOR_HIGH',
                yearLevel: 'Grade 9',
                status: 'Active',
            },
        }),
        // GRADE SCHOOL Students
        prisma.student.create({
            data: {
                studentNo: 'STU-2024-006',
                lastName: 'Torres',
                firstName: 'Sofia',
                middleInitial: 'P',
                program: 'Elementary',
                gradeLevel: 'GRADE_SCHOOL',
                yearLevel: 'Grade 5',
                status: 'Active',
            },
        }),
    ]);

    console.log(`✅ Created ${students.length} students`);

    // Create Scholarships with proper types: PAED, CHED, LGU
    const scholarships = await Promise.all([
        prisma.scholarship.create({
            data: {
                scholarshipName: 'PAED Academic Excellence',
                sponsor: 'Private Education Assistance Committee',
                type: 'PAED',
                amount: new Prisma.Decimal(15000),
                requirements: 'Minimum GWA of 1.5',
                status: 'Active',
            },
        }),
        prisma.scholarship.create({
            data: {
                scholarshipName: 'PAED Financial Assistance',
                sponsor: 'Private Education Assistance Committee',
                type: 'PAED',
                amount: new Prisma.Decimal(10000),
                requirements: 'Family income below poverty threshold',
                status: 'Active',
            },
        }),
        prisma.scholarship.create({
            data: {
                scholarshipName: 'CHED Merit Scholarship',
                sponsor: 'Commission on Higher Education',
                type: 'CHED',
                amount: new Prisma.Decimal(30000),
                requirements: 'Top 10% of graduating class',
                status: 'Active',
            },
        }),
        prisma.scholarship.create({
            data: {
                scholarshipName: 'CHED TES',
                sponsor: 'Commission on Higher Education',
                type: 'CHED',
                amount: new Prisma.Decimal(20000),
                requirements: 'Qualified TES applicant',
                status: 'Active',
            },
        }),
        prisma.scholarship.create({
            data: {
                scholarshipName: 'LGU City Scholarship',
                sponsor: 'Local Government Unit',
                type: 'LGU',
                amount: new Prisma.Decimal(15000),
                requirements: 'Resident of the city for at least 3 years',
                status: 'Active',
            },
        }),
        prisma.scholarship.create({
            data: {
                scholarshipName: 'LGU Provincial Scholarship',
                sponsor: 'Provincial Government',
                type: 'LGU',
                amount: new Prisma.Decimal(12000),
                requirements: 'Provincial resident',
                status: 'Active',
            },
        }),
    ]);

    console.log(`✅ Created ${scholarships.length} scholarships`);

    // Assign scholarships directly to students
    const updatedStudents = await Promise.all([
        // Juan - PAED scholarship
        prisma.student.update({
            where: { id: students[0].id },
            data: {
                scholarshipId: scholarships[0].id, // PAED
                awardDate: new Date('2025-06-15'),
                startTerm: '1st Semester 2025-2026',
                endTerm: '2nd Semester 2025-2026',
                grantAmount: new Prisma.Decimal(15000),
                scholarshipStatus: 'Active',
            },
        }),
        // Maria - PAED scholarship
        prisma.student.update({
            where: { id: students[1].id },
            data: {
                scholarshipId: scholarships[1].id, // PAED
                awardDate: new Date('2025-07-15'),
                startTerm: '1st Semester 2025-2026',
                endTerm: '2nd Semester 2025-2026',
                grantAmount: new Prisma.Decimal(10000),
                scholarshipStatus: 'Active',
            },
        }),
        // Pedro - CHED scholarship
        prisma.student.update({
            where: { id: students[2].id },
            data: {
                scholarshipId: scholarships[2].id, // CHED
                awardDate: new Date('2025-07-20'),
                startTerm: '1st Semester 2025-2026',
                endTerm: '2nd Semester 2026-2027',
                grantAmount: new Prisma.Decimal(30000),
                scholarshipStatus: 'Active',
            },
        }),
        // Ana (Senior High) - LGU
        prisma.student.update({
            where: { id: students[3].id },
            data: {
                scholarshipId: scholarships[5].id, // LGU
                awardDate: new Date('2025-08-10'),
                startTerm: '1st Semester 2025-2026',
                endTerm: '2nd Semester 2025-2026',
                grantAmount: new Prisma.Decimal(12000),
                scholarshipStatus: 'Active',
            },
        }),
        // Carlos (Junior High) - PAED
        prisma.student.update({
            where: { id: students[4].id },
            data: {
                scholarshipId: scholarships[1].id, // PAED
                awardDate: new Date('2025-08-12'),
                startTerm: '1st Semester 2025-2026',
                endTerm: '2nd Semester 2025-2026',
                grantAmount: new Prisma.Decimal(10000),
                scholarshipStatus: 'Active',
            },
        }),
    ]);

    console.log(`✅ Assigned scholarships to ${updatedStudents.length} students`);

    // Create Disbursements (Direct payments to students)
    const disbursements = await Promise.all([
        // Juan - PAED disbursement
        prisma.disbursement.create({
            data: {
                studentId: students[0].id,
                scholarshipId: scholarships[0].id,
                disbursementDate: new Date('2025-08-01'),
                amount: new Prisma.Decimal(7500),
                term: '1st Semester 2025-2026',
                method: 'Bank Transfer',
            },
        }),
        // Juan - PAED second disbursement
        prisma.disbursement.create({
            data: {
                studentId: students[0].id,
                scholarshipId: scholarships[0].id,
                disbursementDate: new Date('2026-01-05'),
                amount: new Prisma.Decimal(7500),
                term: '2nd Semester 2025-2026',
                method: 'Bank Transfer',
            },
        }),
        // Juan - CHED disbursement
        prisma.disbursement.create({
            data: {
                studentId: students[0].id,
                scholarshipId: scholarships[2].id,
                disbursementDate: new Date('2025-08-01'),
                amount: new Prisma.Decimal(15000),
                term: '1st Semester 2025-2026',
                method: 'Bank Transfer',
            },
        }),
        // Maria - PAED disbursement
        prisma.disbursement.create({
            data: {
                studentId: students[1].id,
                scholarshipId: scholarships[1].id,
                disbursementDate: new Date('2025-08-01'),
                amount: new Prisma.Decimal(5000),
                term: '1st Semester 2025-2026',
                method: 'Check',
            },
        }),
        // Pedro - CHED disbursement
        prisma.disbursement.create({
            data: {
                studentId: students[2].id,
                scholarshipId: scholarships[2].id,
                disbursementDate: new Date('2025-08-15'),
                amount: new Prisma.Decimal(15000),
                term: '1st Semester 2025-2026',
                method: 'Bank Transfer',
            },
        }),
    ]);

    console.log(`✅ Created ${disbursements.length} disbursements`);

    // Create Student Fees with detailed breakdown and subsidy calculation
    const studentFees = await Promise.all([
        // Juan (College) - Total: 50000, Subsidy: 15000 (30%)
        prisma.studentFees.create({
            data: {
                studentId: students[0].id,
                tuitionFee: new Prisma.Decimal(35000),
                otherFee: new Prisma.Decimal(5000),
                miscellaneousFee: new Prisma.Decimal(3000),
                laboratoryFee: new Prisma.Decimal(7000),
                amountSubsidy: new Prisma.Decimal(15000), // PAED
                percentSubsidy: new Prisma.Decimal(30.00), // (15000 / 50000) * 100
                term: '1st Semester 2025-2026',
                academicYear: '2025-2026',
            },
        }),
        // Maria (College) - Total: 45000, Subsidy: 10000 (22.22%)
        prisma.studentFees.create({
            data: {
                studentId: students[1].id,
                tuitionFee: new Prisma.Decimal(30000),
                otherFee: new Prisma.Decimal(5000),
                miscellaneousFee: new Prisma.Decimal(4000),
                laboratoryFee: new Prisma.Decimal(6000),
                amountSubsidy: new Prisma.Decimal(10000), // PAED
                percentSubsidy: new Prisma.Decimal(22.22),
                term: '1st Semester 2025-2026',
                academicYear: '2025-2026',
            },
        }),
        // Pedro (College) - Total: 48000, Subsidy: 30000 (62.5%)
        prisma.studentFees.create({
            data: {
                studentId: students[2].id,
                tuitionFee: new Prisma.Decimal(32000),
                otherFee: new Prisma.Decimal(6000),
                miscellaneousFee: new Prisma.Decimal(3000),
                laboratoryFee: new Prisma.Decimal(7000),
                amountSubsidy: new Prisma.Decimal(30000), // CHED
                percentSubsidy: new Prisma.Decimal(62.50),
                term: '1st Semester 2025-2026',
                academicYear: '2025-2026',
            },
        }),
        // Ana (Senior High) - Total: 25000, Subsidy: 12000 (48%)
        prisma.studentFees.create({
            data: {
                studentId: students[3].id,
                tuitionFee: new Prisma.Decimal(18000),
                otherFee: new Prisma.Decimal(3000),
                miscellaneousFee: new Prisma.Decimal(2000),
                laboratoryFee: new Prisma.Decimal(2000),
                amountSubsidy: new Prisma.Decimal(12000), // LGU
                percentSubsidy: new Prisma.Decimal(48.00),
                term: '1st Semester 2025-2026',
                academicYear: '2025-2026',
            },
        }),
        // Carlos (Junior High) - Total: 20000, Subsidy: 10000 (50%)
        prisma.studentFees.create({
            data: {
                studentId: students[4].id,
                tuitionFee: new Prisma.Decimal(15000),
                otherFee: new Prisma.Decimal(2000),
                miscellaneousFee: new Prisma.Decimal(2000),
                laboratoryFee: new Prisma.Decimal(1000),
                amountSubsidy: new Prisma.Decimal(10000), // PAED
                percentSubsidy: new Prisma.Decimal(50.00),
                term: '1st Semester 2025-2026',
                academicYear: '2025-2026',
            },
        }),
        // Sofia (Grade School) - Total: 15000, Subsidy: 0 (0%)
        prisma.studentFees.create({
            data: {
                studentId: students[5].id,
                tuitionFee: new Prisma.Decimal(12000),
                otherFee: new Prisma.Decimal(1000),
                miscellaneousFee: new Prisma.Decimal(1500),
                laboratoryFee: new Prisma.Decimal(500),
                amountSubsidy: new Prisma.Decimal(0),
                percentSubsidy: new Prisma.Decimal(0.00),
                term: '1st Semester 2025-2026',
                academicYear: '2025-2026',
            },
        }),
    ]);

    console.log(`✅ Created ${studentFees.length} student fees records`);
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
