import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Clear existing data (in reverse order of dependencies)
    await prisma.session.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.disbursement.deleteMany();
    await prisma.studentFees.deleteMany();
    await prisma.student.deleteMany();
    await prisma.scholarship.deleteMany();
    await prisma.user.deleteMany();

    // Create Users
    const adminPassword = await bcrypt.hash('admin123', 12);
    const userPassword = await bcrypt.hash('user123', 12);

    const users = await Promise.all([
        prisma.user.create({
            data: {
                username: 'admin',
                email: 'admin@scholartrack.com',
                passwordHash: adminPassword,
                firstName: 'Admin',
                lastName: 'User',
                role: 'ADMIN',
                status: 'ACTIVE',
            },
        }),
        prisma.user.create({
            data: {
                username: 'user',
                email: 'user@scholartrack.com',
                passwordHash: userPassword,
                firstName: 'Regular',
                lastName: 'User',
                role: 'STAFF',
                status: 'ACTIVE',
            },
        }),
    ]);

    console.log(`✅ Created ${users.length} users (admin/admin123, user/user123)`);

    // Create Students
    const students = await Promise.all([
        // COLLEGE Students (5)
        prisma.student.create({ data: { studentNo: 'STU-2024-001', lastName: 'Dela Cruz', firstName: 'Juan', middleInitial: 'S', program: 'BS Computer Science', gradeLevel: 'COLLEGE', yearLevel: '3rd Year', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-002', lastName: 'Reyes', firstName: 'Maria', middleInitial: 'G', program: 'BS Nursing', gradeLevel: 'COLLEGE', yearLevel: '2nd Year', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-003', lastName: 'Santos', firstName: 'Pedro', middleInitial: null, program: 'BS Information Technology', gradeLevel: 'COLLEGE', yearLevel: '4th Year', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-004', lastName: 'Garcia', firstName: 'Rosa', middleInitial: 'T', program: 'BS Accountancy', gradeLevel: 'COLLEGE', yearLevel: '1st Year', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-005', lastName: 'Mendoza', firstName: 'Luis', middleInitial: 'R', program: 'BS Education', gradeLevel: 'COLLEGE', yearLevel: '3rd Year', status: 'Active' } }),
        // SENIOR HIGH Students (3)
        prisma.student.create({ data: { studentNo: 'STU-2024-006', lastName: 'Gonzales', firstName: 'Ana', middleInitial: 'L', program: 'STEM', gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 11', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-007', lastName: 'Cruz', firstName: 'Miguel', middleInitial: 'D', program: 'ABM', gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 12', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-008', lastName: 'Bautista', firstName: 'Elena', middleInitial: 'V', program: 'HUMSS', gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 11', status: 'Active' } }),
        // JUNIOR HIGH Students (3)
        prisma.student.create({ data: { studentNo: 'STU-2024-009', lastName: 'Ramos', firstName: 'Carlos', middleInitial: 'M', program: 'General Education', gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 9', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-010', lastName: 'Fernandez', firstName: 'Isabel', middleInitial: 'A', program: 'General Education', gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 8', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-011', lastName: 'Aquino', firstName: 'Jose', middleInitial: 'B', program: 'General Education', gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 10', status: 'Active' } }),
        // GRADE SCHOOL Students (4)
        prisma.student.create({ data: { studentNo: 'STU-2024-012', lastName: 'Torres', firstName: 'Sofia', middleInitial: 'P', program: 'Elementary', gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 5', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-013', lastName: 'Villanueva', firstName: 'Marco', middleInitial: 'C', program: 'Elementary', gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 6', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-014', lastName: 'Castillo', firstName: 'Lucia', middleInitial: 'E', program: 'Elementary', gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 4', status: 'Active' } }),
        prisma.student.create({ data: { studentNo: 'STU-2024-015', lastName: 'Morales', firstName: 'Diego', middleInitial: 'F', program: 'Elementary', gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 3', status: 'Active' } }),
    ]);

    console.log(`✅ Created ${students.length} students`);

    // Create Scholarships
    const scholarships = await Promise.all([
        prisma.scholarship.create({ data: { scholarshipName: 'PAEB Academic Excellence', sponsor: 'Private Education Assistance Committee', type: 'PAEB', source: 'EXTERNAL', amount: new Prisma.Decimal(15000), requirements: 'Minimum GWA of 1.5', status: 'Active' } }),
        prisma.scholarship.create({ data: { scholarshipName: 'PAEB Financial Assistance', sponsor: 'Private Education Assistance Committee', type: 'PAEB', source: 'EXTERNAL', amount: new Prisma.Decimal(10000), requirements: 'Family income below poverty threshold', status: 'Active' } }),
        prisma.scholarship.create({ data: { scholarshipName: 'CHED Merit Scholarship', sponsor: 'Commission on Higher Education', type: 'CHED', source: 'EXTERNAL', amount: new Prisma.Decimal(7005), requirements: 'Top 10% of graduating class', status: 'Active' } }),
        prisma.scholarship.create({ data: { scholarshipName: 'CHED TES', sponsor: 'Commission on Higher Education', type: 'CHED', source: 'EXTERNAL', amount: new Prisma.Decimal(20000), requirements: 'Qualified TES applicant', status: 'Active' } }),
        prisma.scholarship.create({ data: { scholarshipName: 'LGU City Scholarship', sponsor: 'Local Government Unit', type: 'LGU', source: 'EXTERNAL', amount: new Prisma.Decimal(15000), requirements: 'Resident of the city for at least 3 years', status: 'Active' } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Alay ng Probinsiya', sponsor: 'Provincial Government', type: 'LGU', source: 'EXTERNAL', amount: new Prisma.Decimal(12000), requirements: 'Provincial resident scholarship', status: 'Active' } }),
        prisma.scholarship.create({ data: { scholarshipName: 'School Financial Aid', sponsor: 'School Administration', type: 'SCHOOL_GRANT', source: 'INTERNAL', amount: new Prisma.Decimal(10000), requirements: 'School-based financial assistance', status: 'Active' } }),
    ]);

    console.log(`✅ Created ${scholarships.length} scholarships`);

    // Assign scholarships to students
    await Promise.all([
        // College
        prisma.student.update({ where: { id: students[0].id }, data: { scholarshipId: scholarships[0].id, awardDate: new Date('2025-06-15'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(15000), scholarshipStatus: 'Active' } }),
        prisma.student.update({ where: { id: students[1].id }, data: { scholarshipId: scholarships[1].id, awardDate: new Date('2025-07-15'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }),
        prisma.student.update({ where: { id: students[2].id }, data: { scholarshipId: scholarships[2].id, awardDate: new Date('2025-07-20'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2026-2027', grantAmount: new Prisma.Decimal(7005), scholarshipStatus: 'Active' } }),
        prisma.student.update({ where: { id: students[3].id }, data: { scholarshipId: scholarships[4].id, awardDate: new Date('2025-08-01'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(15000), scholarshipStatus: 'Active' } }),
        prisma.student.update({ where: { id: students[4].id }, data: { scholarshipId: scholarships[3].id, awardDate: new Date('2025-08-05'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(20000), scholarshipStatus: 'Active' } }),
        // Senior High
        prisma.student.update({ where: { id: students[5].id }, data: { scholarshipId: scholarships[6].id, awardDate: new Date('2025-08-10'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }),
        prisma.student.update({ where: { id: students[6].id }, data: { scholarshipId: scholarships[5].id, awardDate: new Date('2025-08-11'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(12000), scholarshipStatus: 'Active' } }),
        prisma.student.update({ where: { id: students[7].id }, data: { scholarshipId: scholarships[1].id, awardDate: new Date('2025-08-11'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }),
        // Junior High
        prisma.student.update({ where: { id: students[8].id }, data: { scholarshipId: scholarships[1].id, awardDate: new Date('2025-08-12'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }),
        prisma.student.update({ where: { id: students[9].id }, data: { scholarshipId: scholarships[6].id, awardDate: new Date('2025-08-12'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }),
        prisma.student.update({ where: { id: students[10].id }, data: { scholarshipId: scholarships[4].id, awardDate: new Date('2025-08-13'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(15000), scholarshipStatus: 'Active' } }),
        // Grade School
        prisma.student.update({ where: { id: students[11].id }, data: { scholarshipId: scholarships[6].id, awardDate: new Date('2025-08-14'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }),
        prisma.student.update({ where: { id: students[12].id }, data: { scholarshipId: scholarships[1].id, awardDate: new Date('2025-08-14'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }),
        prisma.student.update({ where: { id: students[13].id }, data: { scholarshipId: scholarships[4].id, awardDate: new Date('2025-08-15'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(15000), scholarshipStatus: 'Active' } }),
    ]);

    console.log(`✅ Assigned scholarships to 14 students`);

    // Create Student Fees for all students with scholarships
    await Promise.all([
        // College
        prisma.studentFees.create({ data: { studentId: students[0].id, tuitionFee: new Prisma.Decimal(35000), otherFee: new Prisma.Decimal(5000), miscellaneousFee: new Prisma.Decimal(3000), laboratoryFee: new Prisma.Decimal(7000), amountSubsidy: new Prisma.Decimal(15000), percentSubsidy: new Prisma.Decimal(30.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[1].id, tuitionFee: new Prisma.Decimal(30000), otherFee: new Prisma.Decimal(5000), miscellaneousFee: new Prisma.Decimal(4000), laboratoryFee: new Prisma.Decimal(6000), amountSubsidy: new Prisma.Decimal(10000), percentSubsidy: new Prisma.Decimal(22.22), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[2].id, tuitionFee: new Prisma.Decimal(32000), otherFee: new Prisma.Decimal(6000), miscellaneousFee: new Prisma.Decimal(3000), laboratoryFee: new Prisma.Decimal(7000), amountSubsidy: new Prisma.Decimal(7005), percentSubsidy: new Prisma.Decimal(14.59), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[3].id, tuitionFee: new Prisma.Decimal(28000), otherFee: new Prisma.Decimal(4000), miscellaneousFee: new Prisma.Decimal(3000), laboratoryFee: new Prisma.Decimal(5000), amountSubsidy: new Prisma.Decimal(15000), percentSubsidy: new Prisma.Decimal(37.50), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[4].id, tuitionFee: new Prisma.Decimal(30000), otherFee: new Prisma.Decimal(4000), miscellaneousFee: new Prisma.Decimal(3000), laboratoryFee: new Prisma.Decimal(5000), amountSubsidy: new Prisma.Decimal(20000), percentSubsidy: new Prisma.Decimal(47.62), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        // Senior High
        prisma.studentFees.create({ data: { studentId: students[5].id, tuitionFee: new Prisma.Decimal(18000), otherFee: new Prisma.Decimal(3000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(2000), amountSubsidy: new Prisma.Decimal(10000), percentSubsidy: new Prisma.Decimal(40.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[6].id, tuitionFee: new Prisma.Decimal(18000), otherFee: new Prisma.Decimal(3000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(2000), amountSubsidy: new Prisma.Decimal(12000), percentSubsidy: new Prisma.Decimal(48.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[7].id, tuitionFee: new Prisma.Decimal(18000), otherFee: new Prisma.Decimal(3000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(2000), amountSubsidy: new Prisma.Decimal(10000), percentSubsidy: new Prisma.Decimal(40.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        // Junior High
        prisma.studentFees.create({ data: { studentId: students[8].id, tuitionFee: new Prisma.Decimal(15000), otherFee: new Prisma.Decimal(2000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(1000), amountSubsidy: new Prisma.Decimal(10000), percentSubsidy: new Prisma.Decimal(50.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[9].id, tuitionFee: new Prisma.Decimal(15000), otherFee: new Prisma.Decimal(2000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(1000), amountSubsidy: new Prisma.Decimal(10000), percentSubsidy: new Prisma.Decimal(50.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[10].id, tuitionFee: new Prisma.Decimal(15000), otherFee: new Prisma.Decimal(2000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(1000), amountSubsidy: new Prisma.Decimal(15000), percentSubsidy: new Prisma.Decimal(75.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        // Grade School
        prisma.studentFees.create({ data: { studentId: students[11].id, tuitionFee: new Prisma.Decimal(12000), otherFee: new Prisma.Decimal(1000), miscellaneousFee: new Prisma.Decimal(1500), laboratoryFee: new Prisma.Decimal(500), amountSubsidy: new Prisma.Decimal(10000), percentSubsidy: new Prisma.Decimal(66.67), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[12].id, tuitionFee: new Prisma.Decimal(12000), otherFee: new Prisma.Decimal(1000), miscellaneousFee: new Prisma.Decimal(1500), laboratoryFee: new Prisma.Decimal(500), amountSubsidy: new Prisma.Decimal(10000), percentSubsidy: new Prisma.Decimal(66.67), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[13].id, tuitionFee: new Prisma.Decimal(12000), otherFee: new Prisma.Decimal(1000), miscellaneousFee: new Prisma.Decimal(1500), laboratoryFee: new Prisma.Decimal(500), amountSubsidy: new Prisma.Decimal(15000), percentSubsidy: new Prisma.Decimal(100.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
    ]);

    console.log(`✅ Created 14 student fees records`);

    // Create Disbursements
    await Promise.all([
        prisma.disbursement.create({ data: { studentId: students[0].id, scholarshipId: scholarships[0].id, disbursementDate: new Date('2025-08-01'), amount: new Prisma.Decimal(7500), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }),
        prisma.disbursement.create({ data: { studentId: students[1].id, scholarshipId: scholarships[1].id, disbursementDate: new Date('2025-08-01'), amount: new Prisma.Decimal(5000), term: '1st Semester 2025-2026', method: 'Check' } }),
        prisma.disbursement.create({ data: { studentId: students[2].id, scholarshipId: scholarships[2].id, disbursementDate: new Date('2025-08-15'), amount: new Prisma.Decimal(3502.5), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }),
        prisma.disbursement.create({ data: { studentId: students[3].id, scholarshipId: scholarships[4].id, disbursementDate: new Date('2025-08-20'), amount: new Prisma.Decimal(7500), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }),
        prisma.disbursement.create({ data: { studentId: students[4].id, scholarshipId: scholarships[3].id, disbursementDate: new Date('2025-08-20'), amount: new Prisma.Decimal(10000), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }),
    ]);

    console.log(`✅ Created 5 disbursements`);
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
