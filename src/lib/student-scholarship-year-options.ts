export type ScholarshipAcademicYearSelection = {
  readonly clientKey: string;
  readonly scholarshipId: number;
  readonly academicYearId?: number | null;
};

function resolveAcademicYearId(
  academicYearId: number | null | undefined,
  defaultAcademicYearId: number | null
) {
  return academicYearId ?? defaultAcademicYearId;
}

export function hasScholarshipSelectionForAcademicYear(
  assignments: readonly ScholarshipAcademicYearSelection[],
  scholarshipId: number,
  academicYearId: number | null,
  defaultAcademicYearId: number | null
) {
  return assignments.some(
    (assignment) =>
      assignment.scholarshipId === scholarshipId &&
      resolveAcademicYearId(assignment.academicYearId, defaultAcademicYearId) === academicYearId
  );
}

export function getUnavailableAcademicYearIdsForScholarship(
  assignments: readonly ScholarshipAcademicYearSelection[],
  currentClientKey: string,
  scholarshipId: number,
  defaultAcademicYearId: number | null
): ReadonlySet<number> {
  const unavailableAcademicYearIds = new Set<number>();

  for (const assignment of assignments) {
    if (assignment.clientKey === currentClientKey || assignment.scholarshipId !== scholarshipId) {
      continue;
    }

    const academicYearId = resolveAcademicYearId(assignment.academicYearId, defaultAcademicYearId);
    if (academicYearId !== null) {
      unavailableAcademicYearIds.add(academicYearId);
    }
  }

  return unavailableAcademicYearIds;
}
