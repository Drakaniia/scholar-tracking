import {
  getGradeLevelLabel,
  getScholarshipTypeLabel,
} from '@/components/dashboard/dashboard-formatters';
import type {
  DashboardData,
  DashboardRecentAward,
  ScholarshipTypeDatum,
  StudentChartDatum,
} from '@/components/dashboard/dashboard-types';

function getScholarshipNames(data: DashboardData['recentStudents'][number]) {
  return data.scholarships
    .map((award) => award.scholarship.scholarshipName)
    .filter((name): name is string => Boolean(name));
}

export function getStudentsChartData(data: DashboardData): readonly StudentChartDatum[] {
  return data.charts.studentsByGradeLevel.map((item) => ({
    name: getGradeLevelLabel(item.gradeLevel),
    students: item._count.id,
  }));
}

export function getScholarshipTypeData(data: DashboardData): readonly ScholarshipTypeDatum[] {
  const scholarshipTypeData = data.charts.scholarshipsByType
    .map((item) => ({
      name: getScholarshipTypeLabel(item.type),
      value: item._count.id,
    }))
    .sort((first, second) => second.value - first.value);
  const otherScholarshipTypes = scholarshipTypeData
    .slice(5)
    .reduce((sum, item) => sum + item.value, 0);

  if (otherScholarshipTypes <= 0) {
    return scholarshipTypeData;
  }

  return [...scholarshipTypeData.slice(0, 5), { name: 'Other', value: otherScholarshipTypes }];
}

export function getRecentAwards(data: DashboardData): readonly DashboardRecentAward[] {
  return data.recentStudents.slice(0, 5).map((student): DashboardRecentAward => {
    const firstScholarship = student.scholarships[0]?.scholarship;
    const scholarshipCount = student.scholarships.length;
    const type =
      scholarshipCount > 1
        ? 'Multiple Programs'
        : getScholarshipTypeLabel(firstScholarship?.type || 'Grant');

    return {
      id: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      scholarshipName: firstScholarship?.scholarshipName || 'No scholarship',
      scholarshipCount,
      scholarshipNames: getScholarshipNames(student),
      type,
      date: student.updatedAt,
      status: 'active',
    };
  });
}
