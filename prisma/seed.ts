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
    await prisma.studentScholarship.deleteMany();
    await prisma.student.deleteMany();
    await prisma.scholarship.deleteMany();
    await prisma.user.deleteMany();

    // Create Users with upsert to avoid duplicates
    const adminPassword = await bcrypt.hash('admin123', 12);
    const userPassword = await bcrypt.hash('user123', 12);

    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@scholartrack.com',
            passwordHash: adminPassword,
            firstName: 'ADMIN',
            lastName: 'USER',
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });

    const regularUser = await prisma.user.upsert({
        where: { username: 'user' },
        update: {},
        create: {
            username: 'user',
            email: 'user@scholartrack.com',
            passwordHash: userPassword,
            firstName: 'REGULAR',
            lastName: 'USER',
            role: 'STAFF',
            status: 'ACTIVE',
        },
    });

    const users = [adminUser, regularUser];

    console.log(`✅ Created ${users.length} users (admin/admin123, user/user123)`);

    // Create Students (without studentNo)
    const students = await Promise.all([
        // COLLEGE Students (5)
        prisma.student.create({ data: { lastName: 'DELA CRUZ', firstName: 'JUAN', middleInitial: 'S', program: 'BS Computer Science', gradeLevel: 'COLLEGE', yearLevel: '3rd Year', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'REYES', firstName: 'MARIA', middleInitial: 'G', program: 'BS Nursing', gradeLevel: 'COLLEGE', yearLevel: '2nd Year', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'SANTOS', firstName: 'PEDRO', middleInitial: null, program: 'BS Information Technology', gradeLevel: 'COLLEGE', yearLevel: '4th Year', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'GARCIA', firstName: 'ROSA', middleInitial: 'T', program: 'BS Accountancy', gradeLevel: 'COLLEGE', yearLevel: '1st Year', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'MENDOZA', firstName: 'LUIS', middleInitial: 'R', program: 'BS Education', gradeLevel: 'COLLEGE', yearLevel: '3rd Year', status: 'Active' } }),
        // SENIOR HIGH Students (3)
        prisma.student.create({ data: { lastName: 'GONZALES', firstName: 'ANA', middleInitial: 'L', program: 'STEM', gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 11', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'CRUZ', firstName: 'MIGUEL', middleInitial: 'D', program: 'ABM', gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 12', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'BAUTISTA', firstName: 'ELENA', middleInitial: 'V', program: 'HUMSS', gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 11', status: 'Active' } }),
        // JUNIOR HIGH Students (3)
        prisma.student.create({ data: { lastName: 'RAMOS', firstName: 'CARLOS', middleInitial: 'M', program: 'General Education', gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 9', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'FERNANDEZ', firstName: 'ISABEL', middleInitial: 'A', program: 'General Education', gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 8', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'AQUINO', firstName: 'JOSE', middleInitial: 'B', program: 'General Education', gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 10', status: 'Active' } }),
        // GRADE SCHOOL Students (4)
        prisma.student.create({ data: { lastName: 'TORRES', firstName: 'SOFIA', middleInitial: 'P', program: 'Elementary', gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 5', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'VILLANUEVA', firstName: 'MARCO', middleInitial: 'C', program: 'Elementary', gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 6', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'CASTILLO', firstName: 'LUCIA', middleInitial: 'E', program: 'Elementary', gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 4', status: 'Active' } }),
        prisma.student.create({ data: { lastName: 'MORALES', firstName: 'DIEGO', middleInitial: 'F', program: 'Elementary', gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 3', status: 'Active' } }),
    ]);

    console.log(`✅ Created ${students.length} students`);

    // Create Scholarships
    const scholarships = await Promise.all([
        // ============================================
        // INTERNALLY FUNDED SCHOLARSHIPS
        // ============================================
        prisma.scholarship.create({ data: { scholarshipName: 'Employees Ward (BED/SHS)', sponsor: 'School Administration', type: 'EMPLOYEES_WARD', source: 'INTERNAL', eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH', amount: new Prisma.Decimal(8000), requirements: 'Dependent of school employee', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Employees Ward (HIED)', sponsor: 'School Administration', type: 'EMPLOYEES_WARD', source: 'INTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(10000), requirements: 'Dependent of school employee', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Academic Scholar (BED/SHS)', sponsor: 'School Administration', type: 'ACADEMIC_SCHOLAR', source: 'INTERNAL', eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH,COLLEGE', amount: new Prisma.Decimal(12000), requirements: 'Minimum GWA of 1.5', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Working Scholars', sponsor: 'School Administration', type: 'WORKING_SCHOLARS', source: 'INTERNAL', eligibleGradeLevels: 'SENIOR_HIGH,COLLEGE', amount: new Prisma.Decimal(7000), requirements: 'Part-time work arrangement with school', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Athletic Scholars', sponsor: 'School Athletics Department', type: 'ATHLETIC_SCHOLARS', source: 'INTERNAL', eligibleGradeLevels: 'JUNIOR_HIGH,SENIOR_HIGH,COLLEGE', amount: new Prisma.Decimal(15000), requirements: 'Member of school athletic team', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'School Grant (GS/JHS)', sponsor: 'School Administration', type: 'SCHOOL_GRANT', source: 'INTERNAL', eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH', amount: new Prisma.Decimal(5000), requirements: 'Financial need-based', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'School Grant (SHS)', sponsor: 'School Administration', type: 'SCHOOL_GRANT', source: 'INTERNAL', eligibleGradeLevels: 'SENIOR_HIGH', amount: new Prisma.Decimal(8000), requirements: 'Financial need-based', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'School Grant (HiEd)', sponsor: 'School Administration', type: 'SCHOOL_GRANT', source: 'INTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(10000), requirements: 'Financial need-based', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Faculty & Staff', sponsor: 'School Administration', type: 'FACULTY_STAFF', source: 'INTERNAL', eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH,COLLEGE', amount: new Prisma.Decimal(10000), requirements: 'School employee or dependent', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        
        // ============================================
        // EXTERNALLY FUNDED SCHOLARSHIPS - BED (Basic Education)
        // ============================================
        prisma.scholarship.create({ data: { scholarshipName: 'Private Education Assistance for Basic Education (PAEB) (GS/JHS)', sponsor: 'Private Education Assistance Committee', type: 'PAEB', source: 'EXTERNAL', eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH', amount: new Prisma.Decimal(15000), requirements: 'Minimum GWA of 1.5', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Alumni (BED)', sponsor: 'Alumni Association', type: 'ALUMNI', source: 'EXTERNAL', eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH', amount: new Prisma.Decimal(8000), requirements: 'Recommended by alumni member', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Yearbook (BED)', sponsor: 'Yearbook Committee', type: 'YEARBOOK', source: 'EXTERNAL', eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH', amount: new Prisma.Decimal(5000), requirements: 'Yearbook participation', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Yearbook (SHS)', sponsor: 'Yearbook Committee', type: 'YEARBOOK', source: 'EXTERNAL', eligibleGradeLevels: 'SENIOR_HIGH', amount: new Prisma.Decimal(6000), requirements: 'Yearbook participation', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Education Service Contracting (ESC) (JHS)', sponsor: 'Department of Education', type: 'ESC', source: 'EXTERNAL', eligibleGradeLevels: 'JUNIOR_HIGH', amount: new Prisma.Decimal(12000), requirements: 'ESC voucher holder', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Local Government Unit (LGU) (JHS/SHS)', sponsor: 'Local Government Unit', type: 'LGU', source: 'EXTERNAL', eligibleGradeLevels: 'JUNIOR_HIGH,SENIOR_HIGH', amount: new Prisma.Decimal(10000), requirements: 'Resident of the city/municipality', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Local Government Unit (LGU) (SHS)', sponsor: 'Local Government Unit', type: 'LGU', source: 'EXTERNAL', eligibleGradeLevels: 'SENIOR_HIGH', amount: new Prisma.Decimal(12000), requirements: 'Resident of the city/municipality', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'OLSSEF (SHS)', sponsor: 'OLSSEF Foundation', type: 'OLSSEF', source: 'EXTERNAL', eligibleGradeLevels: 'SENIOR_HIGH', amount: new Prisma.Decimal(8000), requirements: 'Financial need and academic merit', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'EVS (SHS)', sponsor: 'EVS Program', type: 'EVS', source: 'EXTERNAL', eligibleGradeLevels: 'SENIOR_HIGH', amount: new Prisma.Decimal(7000), requirements: 'Vocational track student', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'INDIVIDUAL SPONSORSHIP (JHS/SHS)', sponsor: 'Private Sponsor', type: 'INDIVIDUAL_SPONSORSHIP', source: 'EXTERNAL', eligibleGradeLevels: 'JUNIOR_HIGH,SENIOR_HIGH', amount: new Prisma.Decimal(10000), requirements: 'Sponsored by individual donor', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'UTFI (BED)', sponsor: 'UTFI Foundation', type: 'UTFI', source: 'EXTERNAL', eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH', amount: new Prisma.Decimal(9000), requirements: 'Financial need-based', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Anonymous/SHS', sponsor: 'Anonymous Donor', type: 'ANONYMOUS', source: 'EXTERNAL', eligibleGradeLevels: 'SENIOR_HIGH', amount: new Prisma.Decimal(8000), requirements: 'Financial need and good standing', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        
        // ============================================
        // EXTERNALLY FUNDED SCHOLARSHIPS - HIED (Higher Education)
        // ============================================
        prisma.scholarship.create({ data: { scholarshipName: 'UTFI (HIED)', sponsor: 'UTFI Foundation', type: 'UTFI', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(15000), requirements: 'Financial need-based', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'OLSSEF (HIED)', sponsor: 'OLSSEF Foundation', type: 'OLSSEF', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(12000), requirements: 'Financial need and academic merit', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Alay ng Probinsya', sponsor: 'Provincial Government', type: 'ALAY_NG_PROBINSYA', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(12000), requirements: 'Provincial resident scholarship', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Tertiary Education Subsidy (TES)', sponsor: 'Commission on Higher Education', type: 'TES', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(20000), requirements: 'Qualified TES applicant', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ 
            data: { 
                scholarshipName: 'Acevedo Grant', 
                sponsor: 'Acevedo Foundation', 
                type: 'ACEVEDO_GRANT', 
                source: 'EXTERNAL', 
                eligibleGradeLevels: 'COLLEGE', 
                eligiblePrograms: 'BS Education',
                amount: new Prisma.Decimal(18000),
                requirements: 'Academic excellence and financial need',
                status: 'Active',
                startDate: new Date('2025-06-01'),
                endDate: new Date('2026-05-31')
            }
        }),
        prisma.scholarship.create({ data: { scholarshipName: 'CHED Student Financial Assistance Program (StuFAPs)', sponsor: 'Commission on Higher Education', type: 'STUFAPS', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(25000), requirements: 'CHED StuFAPs qualified', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'CHED Merit Scholarship Program (CMSP)', sponsor: 'CMSP Foundation', type: 'CMSP', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(15000), requirements: 'Academic merit and leadership', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'INDIVIDUAL SPONSORSHIP (HIED)', sponsor: 'Private Sponsor', type: 'INDIVIDUAL_SPONSORSHIP', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(20000), requirements: 'Sponsored by individual donor', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Alumni (HIED)', sponsor: 'Alumni Association', type: 'ALUMNI', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(10000), requirements: 'Recommended by alumni member', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Confederation of School Associations, Inc. (COSCHO)', sponsor: 'COSCHO Foundation', type: 'COSCHO', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(12000), requirements: 'Financial need and academic standing', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Tulong Dunong Program (TDP)', sponsor: 'DILG Tulong Dunong Program', type: 'TULONG_DUNONG', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(22000), requirements: 'Financial need and academic merit', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'Local Government Unit (LGU) (HIED)', sponsor: 'Local Government Unit', type: 'LGU', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(15000), requirements: 'Resident of the city/municipality', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'CHED CSP (Commission on Higher Education Student Program) Scholars', sponsor: 'Commission on Higher Education', type: 'CHED_CSP', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(30000), requirements: 'CHED CSP qualified student', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
        prisma.scholarship.create({ data: { scholarshipName: 'University Association of Quezon City Technological Educational Association (UAQTEA) (DIPLOMA PROGRAM)', sponsor: 'UAQTEA Foundation', type: 'UAQTEA', source: 'EXTERNAL', eligibleGradeLevels: 'COLLEGE', amount: new Prisma.Decimal(18000), requirements: 'Diploma program student', status: 'Active', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') } }),
    ]);

    console.log(`✅ Created ${scholarships.length} scholarships`);

    // Create Student-Scholarship relationships (many-to-many)
    // Index reference:
    // Internal: 0-8 (Employees Ward BED/SHS, Employees Ward HIED, Academic Scholar, Working Scholars, Athletic Scholars, School Grant GS/JHS, School Grant SHS, School Grant HiEd, Faculty & Staff)
    // External BED: 9-20 (PAEB GS/JHS, Alumni BED, Yearbook BED, Yearbook SHS, ESC JHS, LGU JHS/SHS, LGU SHS, OLSSEF SHS, EVS SHS, Individual Sponsorship JHS/SHS, UTFI BED, Anonymous/SHS)
    // External HIED: 21-34 (UTFI HIED, OLSSEF HIED, Alay ng Probinsya, TES, Acevedo Grant, StuFAPs, CMSP, Individual Sponsorship HIED, Alumni HIED, COSCHO, Tulong Dunong, LGU HIED, CHED-CSP, UAQTEA)

    // Student 0 (Juan Dela Cruz - BS Computer Science) - Internal + External
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[0].id, scholarshipId: scholarships[2].id, awardDate: new Date('2025-11-15'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(12000), scholarshipStatus: 'Active' } }), // Academic Scholar
        prisma.studentScholarship.create({ data: { studentId: students[0].id, scholarshipId: scholarships[9].id, awardDate: new Date('2025-11-20'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(15000), scholarshipStatus: 'Active' } }), // PAEB GS/JHS
        prisma.studentScholarship.create({ data: { studentId: students[0].id, scholarshipId: scholarships[26].id, awardDate: new Date('2025-11-25'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(20000), scholarshipStatus: 'Active' } }), // TES
    ]);

    // Student 1 (Maria Reyes - BS Nursing) - Internal + External
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[1].id, scholarshipId: scholarships[3].id, awardDate: new Date('2025-12-15'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(7000), scholarshipStatus: 'Active' } }), // Working Scholars
        prisma.studentScholarship.create({ data: { studentId: students[1].id, scholarshipId: scholarships[21].id, awardDate: new Date('2025-12-20'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(15000), scholarshipStatus: 'Active' } }), // UTFI HIED
        prisma.studentScholarship.create({ data: { studentId: students[1].id, scholarshipId: scholarships[28].id, awardDate: new Date('2025-12-22'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(12000), scholarshipStatus: 'Active' } }), // COSCHO
    ]);

    // Student 2 (Pedro Santos - BS Information Technology) - Multiple External
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[2].id, scholarshipId: scholarships[25].id, awardDate: new Date('2025-12-20'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2026-2027', grantAmount: new Prisma.Decimal(25000), scholarshipStatus: 'Active' } }), // StuFAPs
        prisma.studentScholarship.create({ data: { studentId: students[2].id, scholarshipId: scholarships[32].id, awardDate: new Date('2025-12-25'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(30000), scholarshipStatus: 'Active' } }), // CHED-CSP
    ]);

    // Student 3 (Rosa Garcia - BS Accountancy) - Both Internal and External
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[3].id, scholarshipId: scholarships[0].id, awardDate: new Date('2026-01-01'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(8000), scholarshipStatus: 'Active' } }), // Employees Ward BED/SHS
        prisma.studentScholarship.create({ data: { studentId: students[3].id, scholarshipId: scholarships[23].id, awardDate: new Date('2026-01-05'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(20000), scholarshipStatus: 'Active' } }), // TES
        prisma.studentScholarship.create({ data: { studentId: students[3].id, scholarshipId: scholarships[24].id, awardDate: new Date('2026-01-07'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(18000), scholarshipStatus: 'Active' } }), // Acevedo Grant
    ]);

    // Student 4 (Luis Mendoza - BS Education) - Multiple External
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[4].id, scholarshipId: scholarships[22].id, awardDate: new Date('2026-01-05'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(12000), scholarshipStatus: 'Active' } }), // Alay ng Probinsya
        prisma.studentScholarship.create({ data: { studentId: students[4].id, scholarshipId: scholarships[30].id, awardDate: new Date('2026-01-07'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(22000), scholarshipStatus: 'Active' } }), // Tulong Dunong
    ]);

    // Senior High Students - Both Internal and External
    // Student 5 (Ana Gonzales - STEM)
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[5].id, scholarshipId: scholarships[4].id, awardDate: new Date('2026-01-10'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(15000), scholarshipStatus: 'Active' } }), // Athletic Scholars
        prisma.studentScholarship.create({ data: { studentId: students[5].id, scholarshipId: scholarships[14].id, awardDate: new Date('2026-01-12'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }), // LGU JHS/SHS
        prisma.studentScholarship.create({ data: { studentId: students[5].id, scholarshipId: scholarships[16].id, awardDate: new Date('2026-01-13'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(8000), scholarshipStatus: 'Active' } }), // OLSSEF SHS
    ]);

    // Student 6 (Miguel Cruz - ABM)
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[6].id, scholarshipId: scholarships[7].id, awardDate: new Date('2026-01-11'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }), // School Grant SHS
        prisma.studentScholarship.create({ data: { studentId: students[6].id, scholarshipId: scholarships[15].id, awardDate: new Date('2026-01-13'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(12000), scholarshipStatus: 'Active' } }), // LGU SHS
        prisma.studentScholarship.create({ data: { studentId: students[6].id, scholarshipId: scholarships[19].id, awardDate: new Date('2026-01-14'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }), // Individual Sponsorship JHS/SHS
    ]);

    // Student 7 (Elena Bautista - HUMSS)
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[7].id, scholarshipId: scholarships[1].id, awardDate: new Date('2026-01-11'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }), // Employees Ward HIED
        prisma.studentScholarship.create({ data: { studentId: students[7].id, scholarshipId: scholarships[13].id, awardDate: new Date('2026-01-14'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(6000), scholarshipStatus: 'Active' } }), // Yearbook SHS
        prisma.studentScholarship.create({ data: { studentId: students[7].id, scholarshipId: scholarships[20].id, awardDate: new Date('2026-01-15'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(8000), scholarshipStatus: 'Active' } }), // Anonymous/SHS
    ]);

    // Junior High Students - Both Internal and External
    // Student 8 (Carlos Ramos - Grade 9)
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[8].id, scholarshipId: scholarships[5].id, awardDate: new Date('2026-01-12'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(5000), scholarshipStatus: 'Active' } }), // School Grant GS/JHS
        prisma.studentScholarship.create({ data: { studentId: students[8].id, scholarshipId: scholarships[9].id, awardDate: new Date('2026-01-15'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(15000), scholarshipStatus: 'Active' } }), // PAEB GS/JHS
        prisma.studentScholarship.create({ data: { studentId: students[8].id, scholarshipId: scholarships[12].id, awardDate: new Date('2026-01-16'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(12000), scholarshipStatus: 'Active' } }), // ESC JHS
    ]);

    // Student 9 (Isabel Fernandez - Grade 8)
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[9].id, scholarshipId: scholarships[8].id, awardDate: new Date('2026-01-12'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }), // Faculty & Staff
        prisma.studentScholarship.create({ data: { studentId: students[9].id, scholarshipId: scholarships[14].id, awardDate: new Date('2026-01-16'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }), // LGU JHS/SHS
    ]);

    // Student 10 (Jose Aquino - Grade 10)
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[10].id, scholarshipId: scholarships[11].id, awardDate: new Date('2026-01-13'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }), // UTFI BED
        prisma.studentScholarship.create({ data: { studentId: students[10].id, scholarshipId: scholarships[17].id, awardDate: new Date('2026-01-17'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(7000), scholarshipStatus: 'Active' } }), // EVS SHS
    ]);

    // Grade School Students - Both Internal and External
    // Student 11 (Sofia Torres - Grade 5)
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[11].id, scholarshipId: scholarships[5].id, awardDate: new Date('2026-01-14'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(5000), scholarshipStatus: 'Active' } }), // School Grant GS/JHS
        prisma.studentScholarship.create({ data: { studentId: students[11].id, scholarshipId: scholarships[9].id, awardDate: new Date('2026-01-18'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(15000), scholarshipStatus: 'Active' } }), // PAEB GS/JHS
    ]);

    // Student 12 (Marco Villanueva - Grade 6)
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[12].id, scholarshipId: scholarships[10].id, awardDate: new Date('2026-01-14'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(8000), scholarshipStatus: 'Active' } }), // Alumni BED
        prisma.studentScholarship.create({ data: { studentId: students[12].id, scholarshipId: scholarships[11].id, awardDate: new Date('2026-01-19'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(9000), scholarshipStatus: 'Active' } }), // UTFI BED
    ]);

    // Student 13 (Lucia Castillo - Grade 4)
    await Promise.all([
        prisma.studentScholarship.create({ data: { studentId: students[13].id, scholarshipId: scholarships[12].id, awardDate: new Date('2026-01-15'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(12000), scholarshipStatus: 'Active' } }), // ESC JHS
        prisma.studentScholarship.create({ data: { studentId: students[13].id, scholarshipId: scholarships[18].id, awardDate: new Date('2026-01-20'), startTerm: '1st Semester 2025-2026', endTerm: '2nd Semester 2025-2026', grantAmount: new Prisma.Decimal(10000), scholarshipStatus: 'Active' } }), // Individual Sponsorship JHS/SHS
    ]);

    console.log(`✅ Assigned multiple scholarships to all students`);

    // Create Student Fees for all students
    await Promise.all([
        // College
        prisma.studentFees.create({ data: { studentId: students[0].id, tuitionFee: new Prisma.Decimal(35000), otherFee: new Prisma.Decimal(5000), miscellaneousFee: new Prisma.Decimal(3000), laboratoryFee: new Prisma.Decimal(7000), amountSubsidy: new Prisma.Decimal(25000), percentSubsidy: new Prisma.Decimal(50.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[1].id, tuitionFee: new Prisma.Decimal(30000), otherFee: new Prisma.Decimal(5000), miscellaneousFee: new Prisma.Decimal(4000), laboratoryFee: new Prisma.Decimal(6000), amountSubsidy: new Prisma.Decimal(20000), percentSubsidy: new Prisma.Decimal(44.44), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[2].id, tuitionFee: new Prisma.Decimal(32000), otherFee: new Prisma.Decimal(6000), miscellaneousFee: new Prisma.Decimal(3000), laboratoryFee: new Prisma.Decimal(7000), amountSubsidy: new Prisma.Decimal(22005), percentSubsidy: new Prisma.Decimal(45.84), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[3].id, tuitionFee: new Prisma.Decimal(28000), otherFee: new Prisma.Decimal(4000), miscellaneousFee: new Prisma.Decimal(3000), laboratoryFee: new Prisma.Decimal(5000), amountSubsidy: new Prisma.Decimal(25000), percentSubsidy: new Prisma.Decimal(62.50), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[4].id, tuitionFee: new Prisma.Decimal(30000), otherFee: new Prisma.Decimal(4000), miscellaneousFee: new Prisma.Decimal(3000), laboratoryFee: new Prisma.Decimal(5000), amountSubsidy: new Prisma.Decimal(32000), percentSubsidy: new Prisma.Decimal(76.19), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        // Senior High
        prisma.studentFees.create({ data: { studentId: students[5].id, tuitionFee: new Prisma.Decimal(18000), otherFee: new Prisma.Decimal(3000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(2000), amountSubsidy: new Prisma.Decimal(20000), percentSubsidy: new Prisma.Decimal(80.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[6].id, tuitionFee: new Prisma.Decimal(18000), otherFee: new Prisma.Decimal(3000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(2000), amountSubsidy: new Prisma.Decimal(22000), percentSubsidy: new Prisma.Decimal(88.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[7].id, tuitionFee: new Prisma.Decimal(18000), otherFee: new Prisma.Decimal(3000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(2000), amountSubsidy: new Prisma.Decimal(20000), percentSubsidy: new Prisma.Decimal(80.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        // Junior High
        prisma.studentFees.create({ data: { studentId: students[8].id, tuitionFee: new Prisma.Decimal(15000), otherFee: new Prisma.Decimal(2000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(1000), amountSubsidy: new Prisma.Decimal(20000), percentSubsidy: new Prisma.Decimal(100.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[9].id, tuitionFee: new Prisma.Decimal(15000), otherFee: new Prisma.Decimal(2000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(1000), amountSubsidy: new Prisma.Decimal(20000), percentSubsidy: new Prisma.Decimal(100.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[10].id, tuitionFee: new Prisma.Decimal(15000), otherFee: new Prisma.Decimal(2000), miscellaneousFee: new Prisma.Decimal(2000), laboratoryFee: new Prisma.Decimal(1000), amountSubsidy: new Prisma.Decimal(20000), percentSubsidy: new Prisma.Decimal(100.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        // Grade School
        prisma.studentFees.create({ data: { studentId: students[11].id, tuitionFee: new Prisma.Decimal(12000), otherFee: new Prisma.Decimal(1000), miscellaneousFee: new Prisma.Decimal(1500), laboratoryFee: new Prisma.Decimal(500), amountSubsidy: new Prisma.Decimal(15000), percentSubsidy: new Prisma.Decimal(100.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[12].id, tuitionFee: new Prisma.Decimal(12000), otherFee: new Prisma.Decimal(1000), miscellaneousFee: new Prisma.Decimal(1500), laboratoryFee: new Prisma.Decimal(500), amountSubsidy: new Prisma.Decimal(15000), percentSubsidy: new Prisma.Decimal(100.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
        prisma.studentFees.create({ data: { studentId: students[13].id, tuitionFee: new Prisma.Decimal(12000), otherFee: new Prisma.Decimal(1000), miscellaneousFee: new Prisma.Decimal(1500), laboratoryFee: new Prisma.Decimal(500), amountSubsidy: new Prisma.Decimal(25000), percentSubsidy: new Prisma.Decimal(100.00), term: '1st Semester 2025-2026', academicYear: '2025-2026' } }),
    ]);

    console.log(`✅ Created 14 student fees records`);

    // Create Disbursements
    await Promise.all([
        prisma.disbursement.create({ data: { studentId: students[0].id, scholarshipId: scholarships[2].id, disbursementDate: new Date('2026-02-01'), amount: new Prisma.Decimal(6000), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }), // Academic Scholar
        prisma.disbursement.create({ data: { studentId: students[0].id, scholarshipId: scholarships[9].id, disbursementDate: new Date('2026-02-01'), amount: new Prisma.Decimal(7500), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }), // PAEB GS/JHS
        prisma.disbursement.create({ data: { studentId: students[1].id, scholarshipId: scholarships[3].id, disbursementDate: new Date('2026-02-01'), amount: new Prisma.Decimal(3500), term: '1st Semester 2025-2026', method: 'Check' } }), // Working Scholars
        prisma.disbursement.create({ data: { studentId: students[2].id, scholarshipId: scholarships[25].id, disbursementDate: new Date('2026-02-15'), amount: new Prisma.Decimal(12500), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }), // StuFAPs
        prisma.disbursement.create({ data: { studentId: students[3].id, scholarshipId: scholarships[0].id, disbursementDate: new Date('2026-02-20'), amount: new Prisma.Decimal(4000), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }), // Employees Ward BED/SHS
        prisma.disbursement.create({ data: { studentId: students[4].id, scholarshipId: scholarships[22].id, disbursementDate: new Date('2026-02-20'), amount: new Prisma.Decimal(6000), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }), // Alay ng Probinsya
        prisma.disbursement.create({ data: { studentId: students[5].id, scholarshipId: scholarships[4].id, disbursementDate: new Date('2026-02-22'), amount: new Prisma.Decimal(7500), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }), // Athletic Scholars
        prisma.disbursement.create({ data: { studentId: students[6].id, scholarshipId: scholarships[7].id, disbursementDate: new Date('2026-02-23'), amount: new Prisma.Decimal(5000), term: '1st Semester 2025-2026', method: 'Check' } }), // School Grant SHS
        prisma.disbursement.create({ data: { studentId: students[8].id, scholarshipId: scholarships[9].id, disbursementDate: new Date('2026-02-25'), amount: new Prisma.Decimal(7500), term: '1st Semester 2025-2026', method: 'Bank Transfer' } }), // PAEB GS/JHS
    ]);

    console.log(`✅ Created 9 disbursements`);
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
