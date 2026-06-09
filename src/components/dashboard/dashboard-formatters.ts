import { formatCurrency } from '@/lib/utils';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS } from '@/types';
import type { ScholarshipSource } from '@/types';

const DASHBOARD_GRADE_LEVEL_LABELS = {
  GRADE_SCHOOL: 'Grade School',
  JUNIOR_HIGH: 'Junior High',
  SENIOR_HIGH: 'Senior High',
  COLLEGE: 'College',
} as const;

const DASHBOARD_SCHOLARSHIP_TYPE_LABELS = {
  PAEB: 'PAEB',
  CHED: 'CHED',
  LGU: 'LGU',
  SCHOOL_GRANT: 'School Grant',
} as const;

type DashboardGradeLevel = keyof typeof DASHBOARD_GRADE_LEVEL_LABELS;
type DashboardScholarshipType = keyof typeof DASHBOARD_SCHOLARSHIP_TYPE_LABELS;

function isScholarshipSource(source: string): source is ScholarshipSource {
  return SCHOLARSHIP_SOURCES.some((item) => item === source);
}

function isDashboardGradeLevel(gradeLevel: string): gradeLevel is DashboardGradeLevel {
  return Object.prototype.hasOwnProperty.call(DASHBOARD_GRADE_LEVEL_LABELS, gradeLevel);
}

function isDashboardScholarshipType(type: string): type is DashboardScholarshipType {
  return Object.prototype.hasOwnProperty.call(DASHBOARD_SCHOLARSHIP_TYPE_LABELS, type);
}

function titleCasePart(part: string) {
  if (part.length <= 4) {
    return part;
  }

  return `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`;
}

export function getPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

export function formatPhp(amount: number) {
  return `PHP ${formatCurrency(amount)}`;
}

export function formatCompactPhp(amount: number) {
  const compact = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);

  return `PHP ${compact}`;
}

export function getSourceLabel(source: string) {
  if (source === 'all') {
    return 'All sources';
  }

  if (isScholarshipSource(source)) {
    return SCHOLARSHIP_SOURCE_LABELS[source];
  }

  return source;
}

export function getGradeLevelLabel(gradeLevel: string) {
  if (isDashboardGradeLevel(gradeLevel)) {
    return DASHBOARD_GRADE_LEVEL_LABELS[gradeLevel];
  }

  return gradeLevel || 'Unassigned';
}

export function getScholarshipTypeLabel(type: string) {
  if (isDashboardScholarshipType(type)) {
    return DASHBOARD_SCHOLARSHIP_TYPE_LABELS[type];
  }

  return type.split('_').map(titleCasePart).join(' ');
}
