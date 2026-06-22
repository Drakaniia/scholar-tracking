import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { generateQueryKey, queryOptimizer } from '@/lib/query-optimizer';
import { getAcademicYearStartYear } from '@/lib/scholarship-flow-years';

const CACHE_TTL = 2 * 60 * 1000;
const VALID_SOURCES = new Set(['INTERNAL', 'EXTERNAL']);

type YearBucket = {
  year: number;
  label: string;
  awardCount: number;
  beneficiaryIds: Set<number>;
  awardedAmount: number;
  disbursementCount: number;
  disbursedAmount: number;
  subsidyAmount: number;
  internalAwards: number;
  externalAwards: number;
  internalAmount: number;
  externalAmount: number;
};

type AssignmentYearRelation = {
  year: string;
} | null;

function createYearBuckets(endYear: number) {
  const years = Array.from({ length: 5 }, (_, index) => endYear - 4 + index);
  const buckets = new Map<number, YearBucket>();

  years.forEach((year) => {
    buckets.set(year, {
      year,
      label: String(year),
      awardCount: 0,
      beneficiaryIds: new Set<number>(),
      awardedAmount: 0,
      disbursementCount: 0,
      disbursedAmount: 0,
      subsidyAmount: 0,
      internalAwards: 0,
      externalAwards: 0,
      internalAmount: 0,
      externalAmount: 0,
    });
  });

  return buckets;
}

function getBucketYearFromAcademicYear(
  academicYear: AssignmentYearRelation | undefined,
  fallbackDate: Date
) {
  return academicYear?.year
    ? getAcademicYearStartYear(academicYear.year)
    : fallbackDate.getUTCFullYear();
}

function getAcademicYearLabel(academicYear: AssignmentYearRelation | undefined) {
  return academicYear?.year || null;
}

function buildStudentScholarshipWindowWhere(sourceFilter: string, startDate: Date, endDate: Date) {
  const filters: Record<string, unknown>[] = [
    {
      OR: [
        {
          academicYearRel: {
            is: {
              startDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
        {
          academicYearId: null,
          awardDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      ],
    },
  ];

  if (sourceFilter) {
    filters.unshift({
      scholarship: {
        source: sourceFilter,
      },
    });
  }

  return filters.length === 1 ? filters[0] : { AND: filters };
}

function buildDisbursementWindowWhere(sourceFilter: string, startDate: Date, endDate: Date) {
  const filters: Record<string, unknown>[] = [
    {
      OR: [
        {
          academicYearRel: {
            is: {
              startDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
        {
          academicYearId: null,
          disbursementDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      ],
    },
  ];

  if (sourceFilter) {
    filters.unshift({
      scholarship: {
        source: sourceFilter,
      },
    });
  }

  return filters.length === 1 ? filters[0] : { AND: filters };
}

function compactType(type?: string | null) {
  if (!type) return 'Unclassified';
  return type
    .split('_')
    .map((part) => (part.length <= 4 ? part : `${part[0]}${part.slice(1).toLowerCase()}`))
    .join(' ');
}

function getLoadBucket(count: number) {
  if (count <= 0) return 'none';
  if (count === 1) return 'one';
  if (count === 2) return 'two';
  if (count === 3) return 'three';
  return 'fourPlus';
}

function serializeYearBucket(bucket: YearBucket) {
  return {
    year: bucket.year,
    label: bucket.label,
    awardCount: bucket.awardCount,
    beneficiaryCount: bucket.beneficiaryIds.size,
    awardedAmount: bucket.awardedAmount,
    disbursementCount: bucket.disbursementCount,
    disbursedAmount: bucket.disbursedAmount,
    balance: Math.max(bucket.awardedAmount - bucket.disbursedAmount, 0),
    subsidyAmount: bucket.subsidyAmount,
    internalAwards: bucket.internalAwards,
    externalAwards: bucket.externalAwards,
    internalAmount: bucket.internalAmount,
    externalAmount: bucket.externalAmount,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source') || 'all';
    const sourceFilter = VALID_SOURCES.has(source) ? source : '';
    const gradeLevel = searchParams.get('gradeLevel') || '';
    const endYearParam = Number(searchParams.get('endYear'));
    const endYear =
      Number.isInteger(endYearParam) && endYearParam >= 2000
        ? endYearParam
        : new Date().getFullYear();
    const startYear = endYear - 4;
    const startDate = new Date(Date.UTC(startYear, 0, 1));
    const endDate = new Date(Date.UTC(endYear, 11, 31, 23, 59, 59, 999));

    const cacheKey = generateQueryKey('scholarship-flow', {
      source: sourceFilter || 'all',
      gradeLevel,
      endYear,
    });
    const cachedData = queryOptimizer.get(cacheKey);
    if (cachedData) {
      return NextResponse.json({ success: true, data: cachedData, cached: true });
    }

    const studentScholarshipWindowWhere = buildStudentScholarshipWindowWhere(
      sourceFilter,
      startDate,
      endDate
    );
    const disbursementWindowWhere = buildDisbursementWindowWhere(sourceFilter, startDate, endDate);

    const [awards, disbursements, fees, activeStudents] = await Promise.all([
      prisma.studentScholarship.findMany({
        where: {
          ...studentScholarshipWindowWhere,
          ...(gradeLevel
            ? { student: { gradeLevel } }
            : {}),
        },
        select: {
          studentId: true,
          awardDate: true,
          grantAmount: true,
          academicYearRel: {
            select: {
              year: true,
            },
          },
          scholarship: {
            select: {
              scholarshipName: true,
              source: true,
              type: true,
            },
          },
        },
      }),
      prisma.disbursement.findMany({
        where: {
          ...disbursementWindowWhere,
          ...(gradeLevel
            ? { student: { gradeLevel } }
            : {}),
        },
        select: {
          studentId: true,
          disbursementDate: true,
          amount: true,
          academicYearRel: {
            select: {
              year: true,
            },
          },
          scholarship: {
            select: {
              scholarshipName: true,
              source: true,
              type: true,
            },
          },
        },
      }),
      prisma.studentFees.findMany({
        where: gradeLevel
          ? { student: { gradeLevel } }
          : undefined,
        select: {
          studentId: true,
          academicYear: true,
          amountSubsidy: true,
        },
      }),
      prisma.student.findMany({
        where: {
          isArchived: false,
          status: 'Active',
          ...(gradeLevel
            ? { gradeLevel }
            : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gradeLevel: true,
          yearLevel: true,
          program: true,
          scholarships: {
            where: studentScholarshipWindowWhere,
            select: {
              awardDate: true,
              grantAmount: true,
              scholarshipStatus: true,
              academicYearRel: {
                select: {
                  year: true,
                },
              },
              scholarship: {
                select: {
                  scholarshipName: true,
                  source: true,
                  type: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const buckets = createYearBuckets(endYear);
    const typeMap = new Map<
      string,
      {
        type: string;
        awardCount: number;
        awardedAmount: number;
        beneficiaries: Set<number>;
      }
    >();
    const scholarshipMap = new Map<
      string,
      {
        scholarshipName: string;
        type: string;
        source: string;
        academicYear: string | null;
        awardCount: number;
        awardedAmount: number;
        beneficiaries: Set<number>;
      }
    >();

    awards.forEach((award) => {
      const year =
        getBucketYearFromAcademicYear(award.academicYearRel, award.awardDate) ||
        new Date(award.awardDate).getUTCFullYear();
      const bucket = buckets.get(year);
      if (!bucket) return;

      const amount = Number(award.grantAmount || 0);
      const sourceValue = award.scholarship?.source || 'UNSPECIFIED';
      const type = compactType(award.scholarship?.type);
      const scholarshipName = award.scholarship?.scholarshipName || 'Scholarship Program';
      const academicYear = getAcademicYearLabel(award.academicYearRel);

      bucket.awardCount += 1;
      bucket.awardedAmount += amount;
      bucket.beneficiaryIds.add(award.studentId);

      if (sourceValue === 'INTERNAL') {
        bucket.internalAwards += 1;
        bucket.internalAmount += amount;
      } else if (sourceValue === 'EXTERNAL') {
        bucket.externalAwards += 1;
        bucket.externalAmount += amount;
      }

      const typeRecord =
        typeMap.get(type) ||
        ({
          type,
          awardCount: 0,
          awardedAmount: 0,
          beneficiaries: new Set<number>(),
        } satisfies {
          type: string;
          awardCount: number;
          awardedAmount: number;
          beneficiaries: Set<number>;
        });
      typeRecord.awardCount += 1;
      typeRecord.awardedAmount += amount;
      typeRecord.beneficiaries.add(award.studentId);
      typeMap.set(type, typeRecord);

      const scholarshipKey = `${scholarshipName}:${academicYear || year}`;
      const scholarshipRecord =
        scholarshipMap.get(scholarshipKey) ||
        ({
          scholarshipName,
          type,
          source: sourceValue,
          academicYear,
          awardCount: 0,
          awardedAmount: 0,
          beneficiaries: new Set<number>(),
        } satisfies {
          scholarshipName: string;
          type: string;
          source: string;
          academicYear: string | null;
          awardCount: number;
          awardedAmount: number;
          beneficiaries: Set<number>;
        });
      scholarshipRecord.awardCount += 1;
      scholarshipRecord.awardedAmount += amount;
      scholarshipRecord.beneficiaries.add(award.studentId);
      scholarshipMap.set(scholarshipKey, scholarshipRecord);
    });

    disbursements.forEach((disbursement) => {
      const year =
        getBucketYearFromAcademicYear(
          disbursement.academicYearRel,
          disbursement.disbursementDate
        ) || new Date(disbursement.disbursementDate).getUTCFullYear();
      const bucket = buckets.get(year);
      if (!bucket) return;

      bucket.disbursementCount += 1;
      bucket.disbursedAmount += Number(disbursement.amount || 0);
    });

    fees.forEach((fee) => {
      const year = getAcademicYearStartYear(fee.academicYear);
      const bucket = year ? buckets.get(year) : undefined;
      if (!bucket) return;
      bucket.subsidyAmount += Number(fee.amountSubsidy || 0);
    });

    const loadCounts = {
      none: 0,
      one: 0,
      two: 0,
      three: 0,
      fourPlus: 0,
    };

    const multiScholarshipStudents = activeStudents
      .map((student) => {
        const count = student.scholarships.length;
        const totalAmount = student.scholarships.reduce(
          (sum, scholarship) => sum + Number(scholarship.grantAmount || 0),
          0
        );
        loadCounts[getLoadBucket(count)] += 1;

        return {
          id: student.id,
          studentName: `${student.lastName}, ${student.firstName}`,
          gradeLevel: student.gradeLevel,
          yearLevel: student.yearLevel,
          program: student.program,
          scholarshipCount: count,
          totalAmount,
          scholarships: student.scholarships.map((scholarship) => ({
            scholarshipName: scholarship.scholarship?.scholarshipName || 'Scholarship Program',
            type: compactType(scholarship.scholarship?.type),
            source: scholarship.scholarship?.source || 'UNSPECIFIED',
            amount: Number(scholarship.grantAmount || 0),
            status: scholarship.scholarshipStatus,
            academicYear: getAcademicYearLabel(scholarship.academicYearRel),
          })),
        };
      })
      .filter((student) => student.scholarshipCount > 1)
      .sort(
        (a, b) =>
          b.scholarshipCount - a.scholarshipCount ||
          b.totalAmount - a.totalAmount ||
          a.studentName.localeCompare(b.studentName)
      )
      .slice(0, 8);

    const loadTotal = activeStudents.length || 1;
    const loadDistribution = [
      { key: 'none', label: 'No Scholarship', students: loadCounts.none },
      { key: 'one', label: '1 Scholarship', students: loadCounts.one },
      { key: 'two', label: '2 Scholarships', students: loadCounts.two },
      { key: 'three', label: '3 Scholarships', students: loadCounts.three },
      { key: 'fourPlus', label: '4+ Scholarships', students: loadCounts.fourPlus },
    ].map((row) => ({
      ...row,
      percentage: Math.round((row.students / loadTotal) * 100),
    }));

    const yearRows = Array.from(buckets.values()).map(serializeYearBucket);
    const totalAwarded = yearRows.reduce((sum, row) => sum + row.awardedAmount, 0);
    const totalDisbursed = yearRows.reduce((sum, row) => sum + row.disbursedAmount, 0);
    const totalAwards = yearRows.reduce((sum, row) => sum + row.awardCount, 0);
    const totalBeneficiaries = new Set(awards.map((award) => award.studentId)).size;
    const multiScholarshipCount = loadCounts.two + loadCounts.three + loadCounts.fourPlus;

    const responseData = {
      years: yearRows,
      summary: {
        startYear,
        endYear,
        totalAwarded,
        totalDisbursed,
        totalBalance: Math.max(totalAwarded - totalDisbursed, 0),
        totalAwards,
        totalBeneficiaries,
        activeStudents: activeStudents.length,
        singleScholarshipStudents: loadCounts.one,
        multiScholarshipStudents: multiScholarshipCount,
        noScholarshipStudents: loadCounts.none,
        maxScholarshipsPerStudent: Math.max(
          ...activeStudents.map((student) => student.scholarships.length),
          0
        ),
      },
      loadDistribution,
      multiScholarshipStudents,
      topTypes: Array.from(typeMap.values())
        .map((row) => ({
          type: row.type,
          awardCount: row.awardCount,
          awardedAmount: row.awardedAmount,
          beneficiaryCount: row.beneficiaries.size,
        }))
        .sort((a, b) => b.awardedAmount - a.awardedAmount)
        .slice(0, 8),
      topScholarships: Array.from(scholarshipMap.values())
        .map((row) => ({
          scholarshipName: row.scholarshipName,
          type: row.type,
          source: row.source,
          academicYear: row.academicYear,
          awardCount: row.awardCount,
          awardedAmount: row.awardedAmount,
          beneficiaryCount: row.beneficiaries.size,
        }))
        .sort((a, b) => b.awardedAmount - a.awardedAmount)
        .slice(0, 8),
      source,
    };

    queryOptimizer.set(cacheKey, responseData, CACHE_TTL);

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching scholarship flow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comparative data' },
      { status: 500 }
    );
  }
}
