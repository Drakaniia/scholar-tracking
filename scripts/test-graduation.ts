import prisma from '../src/lib/prisma';

async function testGraduationFields() {
  try {
    console.log('Testing if Prisma client recognizes new graduation fields...');
    
    // Query a single student to see the available fields
    const student = await prisma.student.findFirst({
      take: 1,
    });
    
    if (student) {
      console.log('Student record has the following fields:');
      console.log('- id:', student.id);
      console.log('- firstName:', student.firstName);
      console.log('- lastName:', student.lastName);
      console.log('- gradeLevel:', student.gradeLevel);
      console.log('- yearLevel:', student.yearLevel);
      console.log('- isArchived:', student.isArchived);
      console.log('- graduatedAt:', student.graduatedAt);
      console.log('- graduationStatus:', student.graduationStatus);
    } else {
      console.log('No students found in the database');
    }
  } catch (error) {
    console.error('Error testing graduation fields:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGraduationFields();