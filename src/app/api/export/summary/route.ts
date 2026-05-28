import { NextRequest, NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import * as XLSX from 'xlsx';

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
  return `${Math.round(value * 100)}%`;
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

function addMetricCells(
  row: string[],
  years: string[],
  metrics: Record<string, SummaryMetric>,
  totalStudentsByYear: Record<string, number>,
  options: { showZero?: boolean } = {}
) {
  years.forEach((year, index) => {
    const columns = METRIC_COLUMNS[index];
    const metric = metrics[year] ?? { count: 0, fse: 0 };
    const denominator = totalStudentsByYear[year] ?? 0;

    row[columns.count] = formatCount(metric.count, options.showZero);
    row[columns.fse] = formatFse(metric.fse, options.showZero);
    row[columns.percent] = formatPercent(
      denominator > 0 ? metric.fse / denominator : 0,
      options.showZero
    );
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
      match: () => false,
    },
    scholarships: [scholarship],
  }));
}

function buildDataRows(
  templateRows: Array<{ template: TemplateRow; scholarships: ScholarshipRecord[] }>,
  years: string[],
  totalStudentsByYear: Record<string, number>
) {
  return templateRows.map(({ template, scholarships }) => {
    const row = createRow({
      0: template.label,
      [template.grantColumn ?? 4]: getGrantDisplay(template, scholarships),
    });
    const metrics = aggregateScholarshipMetrics(scholarships, years);
    addMetricCells(row, years, metrics, totalStudentsByYear);
    return {
      row: { kind: 'data', cells: row } satisfies SummaryRow,
      metrics,
    };
  });
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
  const internalRows = buildDataRows(internalTemplateRows, years, totalStudentsByYear);
  internalRows.forEach(({ row }) => rows.push(row));

  const internalTotals = sumMetrics(
    years,
    internalRows.map(({ metrics }) => metrics)
  );
  const internalTotalRow = createRow({ 2: 'TOTAL:' });
  addMetricCells(internalTotalRow, years, internalTotals, totalStudentsByYear, { showZero: true });
  rows.push({ kind: 'total', cells: internalTotalRow });

  rows.push({ kind: 'section', cells: createRow({ 0: 'EXTERNALLY FUNDED ' }) });
  rows.push({ kind: 'heading', cells: createRow({ 0: 'BED' }) });

  const bedTemplateRows = [
    ...takeTemplateScholarships(EXTERNAL_BED_ROWS, scholarships, usedIds),
    ...buildCustomRows(scholarships, 'EXTERNAL', 'BED', usedIds),
  ];
  const bedRows = buildDataRows(bedTemplateRows, years, totalStudentsByYear);
  bedRows.forEach(({ row }) => rows.push(row));

  rows.push({ kind: 'heading', cells: createRow({ 0: 'HIED' }) });

  const hiedTemplateRows = [
    ...takeTemplateScholarships(EXTERNAL_HIED_ROWS, scholarships, usedIds),
    ...buildCustomRows(scholarships, 'EXTERNAL', 'HIED', usedIds),
  ];
  const hiedRows = buildDataRows(hiedTemplateRows, years, totalStudentsByYear);
  hiedRows.forEach(({ row }) => rows.push(row));

  const externalTotals = sumMetrics(
    years,
    [...bedRows, ...hiedRows].map(({ metrics }) => metrics)
  );
  const externalTotalRow = createRow({ 2: 'TOTAL:' });
  addMetricCells(externalTotalRow, years, externalTotals, totalStudentsByYear, {
    showZero: true,
  });
  rows.push({ kind: 'total', cells: externalTotalRow });

  const grandTotals = sumMetrics(years, [internalTotals, externalTotals]);
  const grandTotalRow = createRow({ 1: 'GRAND TOTAL:' });
  addMetricCells(grandTotalRow, years, grandTotals, totalStudentsByYear, { showZero: true });
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

function applyWorkbookStyles(buffer: Buffer, sheets: Array<{ rows: SummaryRow[] }>) {
  const zip = unzipSync(new Uint8Array(buffer));

  sheets.forEach(({ rows }, sheetIndex) => {
    const sheetPath = `xl/worksheets/sheet${sheetIndex + 1}.xml`;
    let sheetXml = strFromU8(zip[sheetPath]);

    rows.forEach((row, rowIndex) => {
      for (let columnIndex = 0; columnIndex < COLUMN_COUNT; columnIndex += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        const styleId = resolveStyle(row.kind, rowIndex, columnIndex);
        sheetXml = setCellStyle(sheetXml, cellRef, styleId);
      }
    });

    zip[sheetPath] = strToU8(sheetXml);
  });

  zip['xl/styles.xml'] = strToU8(STYLES_XML);

  return Buffer.from(zipSync(zip, { level: 6 }));
}

function setCellStyle(xml: string, cellRef: string, styleId: number) {
  const cellPattern = new RegExp(`<c r="${cellRef}"([^>]*)>`, 'g');
  return xml.replace(cellPattern, (_match, attributes: string) => {
    const cleanedAttributes = attributes.replace(/\s+s="\d+"/, '');
    return `<c r="${cellRef}" s="${styleId}"${cleanedAttributes}>`;
  });
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

function buildWorkbook(sheets: Array<{ name: string; rows: SummaryRow[] }>) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet(rows.map((row) => row.cells));

    ws['!cols'] = [
      { wch: 24 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 4 },
      { wch: 10 },
      { wch: 9 },
      { wch: 16 },
      { wch: 4 },
      { wch: 10 },
      { wch: 9 },
      { wch: 16 },
      { wch: 4 },
      { wch: 10 },
      { wch: 9 },
    ];
    ws['!rows'] = rows.map(() => ({ hpt: 18 }));
    ws['!merges'] = [
      { s: { r: 0, c: 7 }, e: { r: 0, c: 10 } },
      { s: { r: 0, c: 11 }, e: { r: 0, c: 14 } },
      { s: { r: 0, c: 15 }, e: { r: 0, c: 18 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(name));
  });

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return applyWorkbookStyles(buffer, sheets);
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

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><color rgb="000000"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
    <font><b/><sz val="11"/><color rgb="000000"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
    <font><sz val="11"/><color rgb="FFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE699"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFF00"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0000"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="4472C4"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="000000"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="14">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="1" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleMedium4"/>
</styleSheet>`;

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
    const buffer = buildWorkbook(sheets);

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
