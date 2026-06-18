import { getAcademicTermCode, getAcademicTermLabel } from './terms';

export interface AcademicYearOption {
  year: string;
  count: number;
}

/**
 * Derives academic year options for the Reports page filter.
 * Only includes years that exist in the AcademicYear table (ignores phantom
 * year strings that may have been stored in fee data when no active academic
 * year was configured).
 *
 * Counts reflect how many fee records reference each academic year.
 */
export function deriveAcademicYearOptions(
  academicYears: Array<{ id: number; year: string }>,
  fees: Array<{ academicYear: string }>
): AcademicYearOption[] {
  const tableYears = new Set(academicYears.map((ay) => ay.year));
  const countMap = new Map<string, number>();

  // Only count fees whose academicYear matches a real AcademicYear table entry
  for (const fee of fees) {
    if (tableYears.has(fee.academicYear)) {
      countMap.set(fee.academicYear, (countMap.get(fee.academicYear) || 0) + 1);
    }
  }

  // Include ALL table years (even those with 0 fees)
  return academicYears
    .filter((ay) => ay.year)
    .sort((a, b) => b.year.localeCompare(a.year))
    .map((ay) => ({ year: ay.year, count: countMap.get(ay.year) || 0 }));
}

export interface ResolvedAcademicYear {
  year: string;
  termCode: string;
  term: string;
}

/**
 * Resolves the academic year string and term from a resolved academic year record.
 * When no academic year is resolved (null), returns empty strings instead of
 * inventing a date-based fallback — preventing phantom year strings from leaking
 * into fee data.
 */
export function resolveAcademicYearForFee(
  resolvedAcademicYear: { year: string; semester: string } | null
): ResolvedAcademicYear {
  if (!resolvedAcademicYear) {
    return { year: '', termCode: '', term: '' };
  }

  const termCode = getAcademicTermCode(resolvedAcademicYear.semester);
  const term = getAcademicTermLabel(termCode);
  return { year: resolvedAcademicYear.year, termCode, term };
}
