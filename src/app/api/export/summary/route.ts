import { NextRequest, NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';

import { workbookToBuffer } from '@/lib/excel';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const COLUMN_COUNT = 19;
const METRIC_COLUMNS = [
  { count: 7, fse: 9, percent: 10, totalStudents: 10 },
  { count: 11, fse: 13, percent: 14, totalStudents: 14 },
  { count: 15, fse: 17, percent: 18, totalStudents: 18 },
] as const;

const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'] as const;

const GRADE_LEVEL_LABELS: Record<(typeof GRADE_LEVELS)[number], string> = {
  GRADE_SCHOOL: 'Grade School',
  JUNIOR_HIGH: 'Junior High',
  SENIOR_HIGH: 'Senior High',
  COLLEGE: 'College',
};

const STYLE = {
  default: 0,
  topFill: 1,
  topCenter: 2,
  yellowBold: 3,
  paleHeaderCenter: 4,
  redWhite: 5,
  redWhiteCenter: 6,
  redWhiteRight: 7,
  blue: 8,
  blueCenter: 9,
  blueRight: 10,
  blackFill: 11,
  bold: 12,
  right: 13,
} as const;

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

type FeeRecord = {
  studentId?: number;
  academicYear: string;
  tuitionFee: DecimalLike;
  otherFee: DecimalLike;
  miscellaneousFee: DecimalLike;
  laboratoryFee: DecimalLike;
  amountSubsidy: DecimalLike;
};

type ScholarshipRecord = {
  id: number;
  scholarshipName: string;
  source: string;
  type: string;
  eligibleGradeLevels: string;
  grantType: string;
  amount: DecimalLike;
  amountSubsidy: DecimalLike;
  tuitionFee: DecimalLike;
  miscellaneousFee: DecimalLike;
  laboratoryFee: DecimalLike;
  otherFee: DecimalLike;
  otherFeeName?: string | null;
  coversTuition: boolean;
  coversMiscellaneous: boolean;
  coversLaboratory: boolean;
  coversOther: boolean;
  students: Array<{
    studentId: number;
    student: {
      gradeLevel: string;
      fees: FeeRecord[];
    } | null;
  }>;
};

type FeeYearRecord = {
  studentId: number;
  academicYear: string;
  student: {
    gradeLevel: string;
  } | null;
};

type SummaryMetric = {
  count: number;
  fse: number;
};

type SummaryRow = {
  kind: 'data' | 'heading' | 'section' | 'total' | 'grand' | 'student-total';
  cells: string[];
};

type TemplateRow = {
  label: string;
  grant: string;
  grantColumn?: number;
  match: (scholarship: ScholarshipRecord) => boolean;
};

function toNumber(value: DecimalLike) {
  return Number(value ?? 0);
}

function normalize(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function includesNormalized(value: string, search: string) {
  return normalize(value).includes(normalize(search));
}

function eligibleLevels(scholarship: ScholarshipRecord) {
  return scholarship.eligibleGradeLevels
    .split(',')
    .map((level) => level.trim())
    .filter(Boolean);
}

function includesCollege(scholarship: ScholarshipRecord) {
  return eligibleLevels(scholarship).includes('COLLEGE');
}

function isBasicEducation(scholarship: ScholarshipRecord) {
  return eligibleLevels(scholarship).some((level) =>
    ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH'].includes(level)
  );
}

function scholarshipMatchesGrade(scholarship: ScholarshipRecord, gradeLevel: string) {
  return (
    eligibleLevels(scholarship).includes(gradeLevel) ||
    scholarship.students.some((assignment) => assignment.student?.gradeLevel === gradeLevel)
  );
}

function filterScholarshipsByGrade(scholarships: ScholarshipRecord[], gradeLevel: string) {
  return scholarships
    .filter((scholarship) => scholarshipMatchesGrade(scholarship, gradeLevel))
    .map((scholarship) => ({
      ...scholarship,
      students: scholarship.students.filter(
        (assignment) => assignment.student?.gradeLevel === gradeLevel
      ),
    }));
}

function safeSheetName(name: string) {
  return name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
}

const INTERNAL_ROWS: TemplateRow[] = [
  {
    label: 'Employees Ward (BED/SHS)',
    grant: '100%/75% (TUITION AND OTHER FEES)',
    grantColumn: 3,
    match: (s) => s.source === 'INTERNAL' && s.type === 'EMPLOYEES_WARD' && !includesCollege(s),
  },
  {
    label: 'Employees Ward (HiEd)',
    grant: '100%/75% (TUITION AND OTHER FEES)',
    grantColumn: 3,
    match: (s) => s.source === 'INTERNAL' && s.type === 'EMPLOYEES_WARD' && includesCollege(s),
  },
  {
    label: 'Academic Scholar (BED/SHS)',
    grant: '100%/50% (TUITION AND OTHERS FEES)',
    grantColumn: 3,
    match: (s) => s.source === 'INTERNAL' && s.type === 'ACADEMIC_SCHOLAR',
  },
  {
    label: 'Working Scholars',
    grant: '1B UNITS OF TUITION AND OTHERS FEES)',
    grantColumn: 3,
    match: (s) => s.source === 'INTERNAL' && s.type === 'WORKING_SCHOLARS',
  },
  {
    label: 'Athietic Scholar',
    grant: '30,000.00/15,000.00 SUBSIDY',
    grantColumn: 3,
    match: (s) => s.source === 'INTERNAL' && s.type === 'ATHLETIC_SCHOLARS',
  },
  {
    label: 'School Grants (GS/JHS)',
    grant: '5,000.00 SUBSIDY',
    grantColumn: 3,
    match: (s) =>
      s.source === 'INTERNAL' &&
      s.type === 'SCHOOL_GRANT' &&
      includesNormalized(s.scholarshipName, 'GS JHS'),
  },
  {
    label: 'School Grants (SHS)',
    grant: 'FULL SUBSIDY/5,000.00',
    grantColumn: 3,
    match: (s) =>
      s.source === 'INTERNAL' &&
      s.type === 'SCHOOL_GRANT' &&
      includesNormalized(s.scholarshipName, 'SHS') &&
      !includesNormalized(s.scholarshipName, 'HIED'),
  },
  {
    label: 'School grants (HiEd)',
    grant: 'FULL SUBSIDY/15,000.00',
    grantColumn: 3,
    match: (s) =>
      s.source === 'INTERNAL' &&
      s.type === 'SCHOOL_GRANT' &&
      (includesCollege(s) || includesNormalized(s.scholarshipName, 'HIED')),
  },
  {
    label: 'Faculty & Staff ',
    grant: '',
    grantColumn: 3,
    match: (s) => s.source === 'INTERNAL' && s.type === 'FACULTY_STAFF',
  },
];

const EXTERNAL_BED_ROWS: TemplateRow[] = [
  {
    label: 'PAEB (GS/SHS)',
    grant: '5,000.00/STUDENT',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'PAEB',
  },
  {
    label: 'ESC (JHS)',
    grant: '9.000.00/STUDENT ',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'ESC',
  },
  {
    label: 'LGU (JHS/SHS)',
    grant: '4,000.00/STUDENT',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'LGU' && !includesCollege(s),
  },
  {
    label: 'OLSSDF (SHS)',
    grant: 'FULL',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'OLSSEF' && !includesCollege(s),
  },
  {
    label: 'EVS (SHS)',
    grant: '(14,000 PRIVATE/17,500 PUBLIC)',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'EVS',
  },
  {
    label: 'INDIVIDUAL SPONSORSHIP ',
    grant: 'FULL/5,000.00',
    match: (s) =>
      s.source === 'EXTERNAL' && s.type === 'INDIVIDUAL_SPONSORSHIP' && !includesCollege(s),
  },
  {
    label: 'UTFI',
    grant: 'FULL',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'UTFI' && !includesCollege(s),
  },
];

const EXTERNAL_HIED_ROWS: TemplateRow[] = [
  {
    label: 'UTFI',
    grant: 'FULL',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'UTFI' && includesCollege(s),
  },
  {
    label: 'OLSSEF',
    grant: 'FULL',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'OLSSEF' && includesCollege(s),
  },
  {
    label: 'ALAY NG PROBINSYANO',
    grant: '3,000.00/STUDENT',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'ALAY_NG_PROBINSYA',
  },
  {
    label: 'TES',
    grant: '13,5000/STUDENT',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'TES',
  },
  {
    label: 'ACEVEDO GRANT',
    grant: 'FULL',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'ACEVEDO_GRANT',
  },
  {
    label: 'STUF APS',
    grant: '3,000.00/STUDENT',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'STUFAPS',
  },
  {
    label: 'CMSP',
    grant: '30,000.00/60,000 PER STUDENT',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'CMSP',
  },
  {
    label: 'INVIDUAL SPONSORSHIP',
    grant: 'FULL STUDENT',
    match: (s) =>
      s.source === 'EXTERNAL' && s.type === 'INDIVIDUAL_SPONSORSHIP' && includesCollege(s),
  },
  {
    label: 'ALUMNI',
    grant: '',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'ALUMNI' && includesCollege(s),
  },
  {
    label: 'CONSCHO',
    grant: '60,000.00/STUDENT',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'COSCHO',
  },
  {
    label: 'TULONG DUNONG',
    grant: '7,500/STUDENT',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'TULONG_DUNONG',
  },
  {
    label: 'LGU (JHS/SHS)',
    grant: '7,000/STUDENT',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'LGU' && includesCollege(s),
  },
  {
    label: 'UAQTEA (DIPLOMA PROGRAM)',
    grant: '   FULL',
    match: (s) => s.source === 'EXTERNAL' && s.type === 'UAQTEA',
  },
];

function createRow(cells: Record<number, string> = {}) {
  const row = Array<string>(COLUMN_COUNT).fill('');
  Object.entries(cells).forEach(([column, value]) => {
    row[Number(column)] = value;
  });
  return row;
}

function parseAcademicYearStart(year: string) {
  const match = year.match(/^(\d{4})/);
  return match ? Number(match[1]) : Number.NEGATIVE_INFINITY;
}

function sortAcademicYears(years: string[]) {
  return [...years].sort((a, b) => {
    const startDiff = parseAcademicYearStart(a) - parseAcademicYearStart(b);
    return startDiff || a.localeCompare(b);
  });
}

function previousAcademicYear(year: string) {
  const start = parseAcademicYearStart(year);
  if (!Number.isFinite(start)) return year;
  return `${start - 1}-${start}`;
}

function currentAcademicYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = month >= 5 ? year : year - 1;
  return `${start}-${start + 1}`;
}

function resolveDisplayYears(years: string[]) {
  const cleanedYears = Array.from(new Set(years.filter(Boolean)));
  const sortedYears = sortAcademicYears(cleanedYears);
  const resolved = sortedYears.length > 0 ? sortedYears.slice(-3) : [currentAcademicYear()];

  while (resolved.length < 3) {
    resolved.unshift(previousAcademicYear(resolved[0]));
  }

  return sortAcademicYears(resolved).slice(-3);
}

function formatCount(value: number, showZero = false) {
  if (value === 0 && !showZero) return '';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function formatFse(value: number, showZero = false) {
  if (value === 0 && !showZero) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number, showZero = false) {
  if (value === 0 && !showZero) return '';
  
  // For grand total calculation: value is COUNT / GRAND_FSE, don't multiply
  // Just floor to whole number
  return `${Math.floor(value)}%`;
}

function formatMoney(value: DecimalLike) {
  const amount = toNumber(value);
  if (amount === 0) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const GRANT_TYPE_LABELS: Record<string, string> = {
  FULL: 'FULL',
  TUITION_ONLY: 'TUITION ONLY',
  MISC_ONLY: 'MISC ONLY',
  LAB_ONLY: 'LAB ONLY',
  NONE: 'NONE',
};

function formatCoveredFee(enabled: boolean, label: string, amount: DecimalLike) {
  if (!enabled) return '';
  const formatted = formatMoney(amount);
  return formatted ? `${formatted} ${label}` : label;
}

function generatedGrantText(scholarship: ScholarshipRecord) {
  const coveredFees = [
    formatCoveredFee(scholarship.coversTuition, 'TUITION', scholarship.tuitionFee),
    formatCoveredFee(scholarship.coversMiscellaneous, 'MISC', scholarship.miscellaneousFee),
    formatCoveredFee(scholarship.coversLaboratory, 'LAB', scholarship.laboratoryFee),
    formatCoveredFee(
      scholarship.coversOther,
      scholarship.otherFeeName || 'OTHER',
      scholarship.otherFee
    ),
  ].filter(Boolean);

  const amount = formatMoney(scholarship.amount);
  const subsidy = formatMoney(scholarship.amountSubsidy);
  const amountParts = [
    amount ? `${amount}/STUDENT` : '',
    subsidy ? `${subsidy} SUBSIDY` : '',
  ].filter(Boolean);

  if (coveredFees.length > 0 || amountParts.length > 0) {
    return [...coveredFees, ...amountParts].join('/');
  }

  return GRANT_TYPE_LABELS[scholarship.grantType] ?? scholarship.grantType;
}

function getGrantDisplay(template: TemplateRow, scholarships: ScholarshipRecord[]) {
  const dataDrivenGrants = Array.from(
    new Set(scholarships.map((scholarship) => generatedGrantText(scholarship)).filter(Boolean))
  );

  return dataDrivenGrants.length > 0 ? dataDrivenGrants.join('; ') : template.grant;
}

function aggregateFeesByYear(fees: FeeRecord[]) {
  const byYear = new Map<
    string,
    {
      tuitionFee: number;
      otherFee: number;
      miscellaneousFee: number;
      laboratoryFee: number;
      amountSubsidy: number;
    }
  >();

  fees.forEach((fee) => {
    const existing = byYear.get(fee.academicYear) ?? {
      tuitionFee: 0,
      otherFee: 0,
      miscellaneousFee: 0,
      laboratoryFee: 0,
      amountSubsidy: 0,
    };

    existing.tuitionFee += toNumber(fee.tuitionFee);
    existing.otherFee += toNumber(fee.otherFee);
    existing.miscellaneousFee += toNumber(fee.miscellaneousFee);
    existing.laboratoryFee += toNumber(fee.laboratoryFee);
    existing.amountSubsidy += toNumber(fee.amountSubsidy);
    byYear.set(fee.academicYear, existing);
  });

  return byYear;
}

function calculateFse(
  fees: ReturnType<typeof aggregateFeesByYear> extends Map<string, infer T> ? T : never
) {
  const totalFees = fees.tuitionFee + fees.otherFee + fees.miscellaneousFee + fees.laboratoryFee;
  return totalFees > 0 ? fees.amountSubsidy / totalFees : 0;
}

function aggregateScholarshipMetrics(
  scholarships: ScholarshipRecord[],
  years: string[]
): Record<string, SummaryMetric> {
  const metrics = Object.fromEntries(
    years.map((year) => [year, { studentIds: new Set<number>(), fse: 0 }])
  ) as Record<string, { studentIds: Set<number>; fse: number }>;

  scholarships.forEach((scholarship) => {
    scholarship.students.forEach((assignment) => {
      const feesByYear = aggregateFeesByYear(assignment.student?.fees ?? []);

      years.forEach((year) => {
        const fees = feesByYear.get(year);
        if (!fees) return;

        metrics[year].studentIds.add(assignment.studentId);
        metrics[year].fse += calculateFse(fees);
      });
    });
  });

  return Object.fromEntries(
    years.map((year) => [
      year,
      {
        count: metrics[year].studentIds.size,
        fse: metrics[year].fse,
      },
    ])
  );
}

function aggregatePercentFseMetrics(
  scholarships: ScholarshipRecord[],
  years: string[]
): Record<string, SummaryMetric> {
  const metrics = Object.fromEntries(
    years.map((year) => [year, { studentIds: new Set<number>(), fse: 0 }])
  ) as Record<string, { studentIds: Set<number>; fse: number }>;

  scholarships.forEach((scholarship) => {
    const scholarSubsidy = toNumber(scholarship.amountSubsidy);
    if (!scholarSubsidy) return;

    scholarship.students.forEach((assignment) => {
      const feesByYear = aggregateFeesByYear(assignment.student?.fees ?? []);

      years.forEach((year) => {
        const fees = feesByYear.get(year);
        if (!fees) return;

        const totalFees = fees.tuitionFee + fees.otherFee + fees.miscellaneousFee + fees.laboratoryFee;
        if (totalFees <= 0) return;

        metrics[year].studentIds.add(assignment.studentId);
        metrics[year].fse += scholarSubsidy / totalFees;
      });
    });
  });

  return Object.fromEntries(
    years.map((year) => [
      year,
      {
        count: metrics[year].studentIds.size,
        fse: metrics[year].fse,
      },
    ])
  );
}

function addMetricCells(
  row: string[],
  years: string[],
  metrics: Record<string, SummaryMetric>,
  totalStudentsByYear: Record<string, number>,
  options: { showZero?: boolean; grandTotals?: Record<string, SummaryMetric> } = {},
  percentMetrics?: Record<string, SummaryMetric>
) {
  years.forEach((year, index) => {
    const columns = METRIC_COLUMNS[index];
    const metric = metrics[year] ?? { count: 0, fse: 0 };
    const pctMetric = percentMetrics?.[year] ?? metric;
    const grandTotal = options.grandTotals?.[year];

    row[columns.count] = formatCount(metric.count, options.showZero);
    row[columns.fse] = formatFse(metric.fse, options.showZero);
    
    // Calculate percentage as: COUNT / GRAND_TOTAL_FSE
    const percentValue = grandTotal && grandTotal.fse > 0 
      ? pctMetric.count / grandTotal.fse 
      : (pctMetric.count > 0 ? pctMetric.fse / pctMetric.count : 0);
    
    row[columns.percent] = formatPercent(percentValue, options.showZero);
  });
}

function sumMetrics(years: string[], rows: Array<Record<string, SummaryMetric>>) {
  return Object.fromEntries(
    years.map((year) => [
      year,
      rows.reduce(
        (total, row) => ({
          count: total.count + (row[year]?.count ?? 0),
          fse: total.fse + (row[year]?.fse ?? 0),
        }),
        { count: 0, fse: 0 }
      ),
    ])
  );
}

function takeTemplateScholarships(
  templates: TemplateRow[],
  scholarships: ScholarshipRecord[],
  usedIds: Set<number>
) {
  return templates.map((template) => {
    const matches = scholarships.filter((scholarship) => template.match(scholarship));
    matches.forEach((scholarship) => usedIds.add(scholarship.id));
    return { template, scholarships: matches };
  });
}

function buildCustomRows(
  scholarships: ScholarshipRecord[],
  source: 'INTERNAL' | 'EXTERNAL',
  section: 'BED' | 'HIED' | null,
  usedIds: Set<number>
) {
  const customScholarships = scholarships
    .filter((scholarship) => !usedIds.has(scholarship.id) && scholarship.source === source)
    .filter((scholarship) => {
      if (!section) return true;
      return section === 'HIED' ? includesCollege(scholarship) : isBasicEducation(scholarship);
    })
    .sort((a, b) => a.scholarshipName.localeCompare(b.scholarshipName));

  customScholarships.forEach((scholarship) => usedIds.add(scholarship.id));

  return customScholarships.map((scholarship) => ({
    template: {
      label: scholarship.scholarshipName.toUpperCase(),
      grant: '',
      grantColumn: 4,
      match: () => false,
    },
    scholarships: [scholarship],
  }));
}

function buildSummaryRows(
  scholarships: ScholarshipRecord[],
  years: string[],
  totalStudentsByYear: Record<string, number>
) {
  const usedIds = new Set<number>();
  const rows: SummaryRow[] = [];

  rows.push({
    kind: 'heading',
    cells: createRow({
      0: 'SCHOLARSHIP',
      4: 'GRANT',
      7: years[0],
      11: years[1],
      15: years[2],
    }),
  });
  rows.push({
    kind: 'section',
    cells: createRow({
      0: 'INTERNALLY FUNDED',
      7: 'NO. OF STUDENTS',
      9: 'FSE',
      10: '% FSE',
      11: 'NO. OF STUDENTS',
      13: 'FSE',
      14: '% FSE',
      15: 'NO. OF STUDENT',
      17: 'FSE',
      18: '%FSE',
    }),
  });

  const internalTemplateRows = [
    ...takeTemplateScholarships(INTERNAL_ROWS, scholarships, usedIds),
    ...buildCustomRows(scholarships, 'INTERNAL', null, usedIds),
  ];

  const bedTemplateRows = [
    ...takeTemplateScholarships(EXTERNAL_BED_ROWS, scholarships, usedIds),
    ...buildCustomRows(scholarships, 'EXTERNAL', 'BED', usedIds),
  ];

  const hiedTemplateRows = [
    ...takeTemplateScholarships(EXTERNAL_HIED_ROWS, scholarships, usedIds),
    ...buildCustomRows(scholarships, 'EXTERNAL', 'HIED', usedIds),
  ];

  // Calculate all metrics first to get grand totals
  const internalMetrics = internalTemplateRows.map(({ scholarships: schols }) => ({
    metrics: aggregateScholarshipMetrics(schols, years),
    percentMetrics: aggregatePercentFseMetrics(schols, years),
  }));

  const bedMetrics = bedTemplateRows.map(({ scholarships: schols }) => ({
    metrics: aggregateScholarshipMetrics(schols, years),
    percentMetrics: aggregatePercentFseMetrics(schols, years),
  }));

  const hiedMetrics = hiedTemplateRows.map(({ scholarships: schols }) => ({
    metrics: aggregateScholarshipMetrics(schols, years),
    percentMetrics: aggregatePercentFseMetrics(schols, years),
  }));

  const internalTotals = sumMetrics(
    years,
    internalMetrics.map(({ metrics }) => metrics)
  );
  const internalPctTotals = sumMetrics(
    years,
    internalMetrics.map(({ percentMetrics }) => percentMetrics)
  );

  const externalTotals = sumMetrics(
    years,
    [...bedMetrics, ...hiedMetrics].map(({ metrics }) => metrics)
  );
  const externalPctTotals = sumMetrics(
    years,
    [...bedMetrics, ...hiedMetrics].map(({ percentMetrics }) => percentMetrics)
  );

  const grandTotals = sumMetrics(years, [internalTotals, externalTotals]);
  const grandPctTotals = sumMetrics(years, [internalPctTotals, externalPctTotals]);

  // Now build rows with grand totals available
  internalTemplateRows.forEach(({ template, scholarships: schols }, idx) => {
    const row = createRow({
      0: template.label,
      [template.grantColumn ?? 4]: getGrantDisplay(template, schols),
    });
    addMetricCells(row, years, internalMetrics[idx].metrics, totalStudentsByYear, { grandTotals }, internalMetrics[idx].percentMetrics);
    rows.push({ kind: 'data', cells: row });
  });

  const internalTotalRow = createRow({ 2: 'TOTAL:' });
  addMetricCells(internalTotalRow, years, internalTotals, totalStudentsByYear, { showZero: true, grandTotals }, internalPctTotals);
  rows.push({ kind: 'total', cells: internalTotalRow });

  rows.push({ kind: 'section', cells: createRow({ 0: 'EXTERNALLY FUNDED ' }) });
  rows.push({ kind: 'heading', cells: createRow({ 0: 'BED' }) });

  bedTemplateRows.forEach(({ template, scholarships: schols }, idx) => {
    const row = createRow({
      0: template.label,
      [template.grantColumn ?? 4]: getGrantDisplay(template, schols),
    });
    addMetricCells(row, years, bedMetrics[idx].metrics, totalStudentsByYear, { grandTotals }, bedMetrics[idx].percentMetrics);
    rows.push({ kind: 'data', cells: row });
  });

  rows.push({ kind: 'heading', cells: createRow({ 0: 'HIED' }) });

  hiedTemplateRows.forEach(({ template, scholarships: schols }, idx) => {
    const row = createRow({
      0: template.label,
      [template.grantColumn ?? 4]: getGrantDisplay(template, schols),
    });
    addMetricCells(row, years, hiedMetrics[idx].metrics, totalStudentsByYear, { grandTotals }, hiedMetrics[idx].percentMetrics);
    rows.push({ kind: 'data', cells: row });
  });

  const externalTotalRow = createRow({ 2: 'TOTAL:' });
  addMetricCells(externalTotalRow, years, externalTotals, totalStudentsByYear, {
    showZero: true,
    grandTotals,
  }, externalPctTotals);
  rows.push({ kind: 'total', cells: externalTotalRow });

  const grandTotalRow = createRow({ 1: 'GRAND TOTAL:' });
  addMetricCells(grandTotalRow, years, grandTotals, totalStudentsByYear, { showZero: true, grandTotals }, grandPctTotals);
  rows.push({ kind: 'grand', cells: grandTotalRow });

  const studentTotalRow = createRow({ 0: 'TOTAL OF STRUDENTS:' });
  years.forEach((year, index) => {
    studentTotalRow[METRIC_COLUMNS[index].totalStudents] = formatCount(
      totalStudentsByYear[year] ?? 0,
      true
    );
  });
  rows.push({ kind: 'student-total', cells: studentTotalRow });

  return rows;
}

function resolveStyle(kind: SummaryRow['kind'], rowIndex: number, columnIndex: number) {
  const isMetricColumn = METRIC_COLUMNS.some(({ count, fse, percent }) =>
    ([count, fse, percent] as number[]).includes(columnIndex)
  );

  if (rowIndex === 0) {
    return columnIndex >= 7 ? STYLE.topCenter : STYLE.topFill;
  }

  if (rowIndex === 1) {
    return columnIndex <= 5 ? STYLE.yellowBold : STYLE.paleHeaderCenter;
  }

  if (kind === 'section') return STYLE.yellowBold;
  if (kind === 'total') {
    if (isMetricColumn) return STYLE.redWhiteRight;
    if (columnIndex === 2) return STYLE.redWhiteCenter;
    return STYLE.redWhite;
  }
  if (kind === 'grand') {
    if (isMetricColumn) return STYLE.blueRight;
    if (columnIndex === 1) return STYLE.blueCenter;
    return STYLE.blue;
  }
  if (kind === 'student-total') {
    if (columnIndex >= 3 && columnIndex <= 6) return STYLE.blackFill;
    if (isMetricColumn) return STYLE.right;
    return STYLE.default;
  }
  if (kind === 'heading') return columnIndex === 0 ? STYLE.bold : STYLE.default;
  if (isMetricColumn) return STYLE.right;
  return STYLE.default;
}

function argb(rgb: string) {
  return `FF${rgb}`;
}

function setFill(cell: ExcelJS.Cell, rgb: string) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: argb(rgb) },
  };
}

function setFont(cell: ExcelJS.Cell, options: { bold?: boolean; color?: string } = {}) {
  cell.font = {
    name: 'Calibri',
    size: 11,
    bold: options.bold,
    color: options.color ? { argb: argb(options.color) } : undefined,
  };
}

function applyCellStyle(cell: ExcelJS.Cell, styleId: number) {
  setFont(cell);

  switch (styleId) {
    case STYLE.topFill:
      setFill(cell, 'FFE699');
      break;
    case STYLE.topCenter:
      setFill(cell, 'FFE699');
      cell.alignment = { horizontal: 'center' };
      break;
    case STYLE.yellowBold:
      setFont(cell, { bold: true });
      setFill(cell, 'FFFF00');
      break;
    case STYLE.paleHeaderCenter:
      setFont(cell, { bold: true });
      setFill(cell, 'FFE699');
      cell.alignment = { horizontal: 'center' };
      break;
    case STYLE.redWhite:
      setFont(cell, { color: 'FFFFFF' });
      setFill(cell, 'FF0000');
      break;
    case STYLE.redWhiteCenter:
      setFont(cell, { bold: true, color: 'FFFFFF' });
      setFill(cell, 'FF0000');
      cell.alignment = { horizontal: 'center' };
      break;
    case STYLE.redWhiteRight:
      setFont(cell, { color: 'FFFFFF' });
      setFill(cell, 'FF0000');
      cell.alignment = { horizontal: 'right' };
      break;
    case STYLE.blue:
      setFill(cell, '4472C4');
      break;
    case STYLE.blueCenter:
      setFont(cell, { bold: true });
      setFill(cell, '4472C4');
      cell.alignment = { horizontal: 'center' };
      break;
    case STYLE.blueRight:
      setFill(cell, '4472C4');
      cell.alignment = { horizontal: 'right' };
      break;
    case STYLE.blackFill:
      setFill(cell, '000000');
      break;
    case STYLE.bold:
      setFont(cell, { bold: true });
      break;
    case STYLE.right:
      cell.alignment = { horizontal: 'right' };
      break;
  }
}

async function buildWorkbook(sheets: Array<{ name: string; rows: SummaryRow[] }>) {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(({ name, rows }) => {
    const worksheet = workbook.addWorksheet(safeSheetName(name));

    worksheet.columns = [24, 12, 12, 14, 24, 18, 12, 16, 4, 10, 9, 16, 4, 10, 9, 16, 4, 10, 9].map(
      (width) => ({ width })
    );

    rows.forEach((summaryRow, rowIndex) => {
      const worksheetRow = worksheet.addRow(summaryRow.cells);
      worksheetRow.height = 18;

      for (let columnIndex = 0; columnIndex < COLUMN_COUNT; columnIndex += 1) {
        applyCellStyle(
          worksheetRow.getCell(columnIndex + 1),
          resolveStyle(summaryRow.kind, rowIndex, columnIndex)
        );
      }
    });

    worksheet.mergeCells(1, 8, 1, 11);
    worksheet.mergeCells(1, 12, 1, 15);
    worksheet.mergeCells(1, 16, 1, 19);
  });

  return workbookToBuffer(workbook);
}

function buildTotalStudentsByYear(fees: FeeYearRecord[], gradeLevel: string) {
  const totals = new Map<string, Set<number>>();

  fees
    .filter((fee) => fee.student?.gradeLevel === gradeLevel)
    .forEach((fee) => {
      if (!totals.has(fee.academicYear)) {
        totals.set(fee.academicYear, new Set<number>());
      }
      totals.get(fee.academicYear)?.add(fee.studentId);
    });

  return Object.fromEntries(
    Array.from(totals.entries()).map(([year, studentIds]) => [year, studentIds.size])
  );
}

// GET /api/export/summary - Export sample-style scholarship summary workbook
export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format') || 'xlsx';

    if (format !== 'xlsx') {
      return NextResponse.json(
        { success: false, error: 'Summary export is only available as XLSX' },
        { status: 400 }
      );
    }

    const [feeYears, academicYears, scholarships] = await Promise.all([
      prisma.studentFees.findMany({
        select: {
          studentId: true,
          academicYear: true,
          student: {
            select: {
              gradeLevel: true,
            },
          },
        },
        orderBy: { academicYear: 'asc' },
      }),
      prisma.academicYear.findMany({
        select: { year: true },
        orderBy: { year: 'asc' },
      }),
      prisma.scholarship.findMany({
        include: {
          students: {
            select: {
              studentId: true,
              student: {
                select: {
                  gradeLevel: true,
                  fees: {
                    select: {
                      tuitionFee: true,
                      otherFee: true,
                      miscellaneousFee: true,
                      laboratoryFee: true,
                      amountSubsidy: true,
                      academicYear: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { scholarshipName: 'asc' },
      }),
    ]);

    const years = resolveDisplayYears([
      ...feeYears.map((fee) => fee.academicYear),
      ...academicYears.map((academicYear) => academicYear.year),
    ]);
    const scholarshipRecords = scholarships as unknown as ScholarshipRecord[];
    const feeYearRecords = feeYears as unknown as FeeYearRecord[];
    const sheets = GRADE_LEVELS.map((gradeLevel) => {
      const gradeScholarships = filterScholarshipsByGrade(scholarshipRecords, gradeLevel);
      const totalStudentsByYear = buildTotalStudentsByYear(feeYearRecords, gradeLevel);

      return {
        name: GRADE_LEVEL_LABELS[gradeLevel],
        rows: buildSummaryRows(gradeScholarships, years, totalStudentsByYear),
      };
    });
    const buffer = await buildWorkbook(sheets);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="scholarship-summary.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting scholarship summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export scholarship summary' },
      { status: 500 }
    );
  }
}
