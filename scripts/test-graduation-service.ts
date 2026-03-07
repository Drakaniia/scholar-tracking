import { hasStudentGraduated } from '../src/lib/graduation-service';

// Test the graduation check function
console.log('Testing graduation logic...');

// Test case 1: College student in 4th year (final year)
const collegeStudent = { gradeLevel: 'COLLEGE', yearLevel: '4th Year' };
console.log(`College student in 4th Year graduated? ${hasStudentGraduated(collegeStudent)}`);

// Test case 2: College student in 3rd year (not final year)
const collegeStudent2 = { gradeLevel: 'COLLEGE', yearLevel: '3rd Year' };
console.log(`College student in 3rd Year graduated? ${hasStudentGraduated(collegeStudent2)}`);

// Test case 3: Senior High student in Grade 12 (final year)
const seniorHighStudent = { gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 12' };
console.log(`Senior High student in Grade 12 graduated? ${hasStudentGraduated(seniorHighStudent)}`);

// Test case 4: Senior High student in Grade 11 (not final year)
const seniorHighStudent2 = { gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 11' };
console.log(`Senior High student in Grade 11 graduated? ${hasStudentGraduated(seniorHighStudent2)}`);

// Test case 5: Junior High student in Grade 10 (final year)
const juniorHighStudent = { gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 10' };
console.log(`Junior High student in Grade 10 graduated? ${hasStudentGraduated(juniorHighStudent)}`);

// Test case 6: Grade School student in Grade 6 (final year)
const gradeSchoolStudent = { gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 6' };
console.log(`Grade School student in Grade 6 graduated? ${hasStudentGraduated(gradeSchoolStudent)}`);