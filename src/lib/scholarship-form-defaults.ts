import type { CreateScholarshipInput, GrantType, Scholarship } from '@/types';

export function buildScholarshipFormDefaultValues(
  scholarship: Scholarship
): Partial<CreateScholarshipInput> {
  return {
    scholarshipName: scholarship.scholarshipName,
    sponsor: scholarship.sponsor,
    type: scholarship.type,
    source: scholarship.source,
    eligibleGradeLevels: scholarship.eligibleGradeLevels || '',
    eligiblePrograms: scholarship.eligiblePrograms || '',
    amount: scholarship.amount,
    amountSubsidy: scholarship.amountSubsidy,
    percentSubsidy: scholarship.percentSubsidy,
    requirements: scholarship.requirements || '',
    status: scholarship.status,
    grantType: scholarship.grantType as GrantType,
    coversTuition: scholarship.coversTuition,
    coversMiscellaneous: scholarship.coversMiscellaneous,
    coversLaboratory: scholarship.coversLaboratory,
    coversOther: scholarship.coversOther,
    coveredTerms: scholarship.coveredTerms,
    otherFeeName: scholarship.otherFeeName || undefined,
    tuitionFee: scholarship.tuitionFee,
    miscellaneousFee: scholarship.miscellaneousFee,
    laboratoryFee: scholarship.laboratoryFee,
    otherFee: scholarship.otherFee,
    academicYearId: scholarship.academicYearId ?? null,
  };
}
