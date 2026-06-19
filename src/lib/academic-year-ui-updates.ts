type AcademicYearLike = {
  id: number;
  startDate: string | Date;
  isActive: boolean;
};

function sortAcademicYearsDescending<T extends AcademicYearLike>(years: T[]) {
  return years.slice().sort((a, b) => {
    const left = new Date(a.startDate).getTime();
    const right = new Date(b.startDate).getTime();
    return right - left;
  });
}

export function upsertAcademicYear<T extends AcademicYearLike>(
  academicYears: readonly T[],
  savedAcademicYear: T
) {
  const exists = academicYears.some((academicYear) => academicYear.id === savedAcademicYear.id);
  const nextYears = exists
    ? academicYears.map((academicYear) =>
        academicYear.id === savedAcademicYear.id ? savedAcademicYear : academicYear
      )
    : [savedAcademicYear, ...academicYears];

  const normalizedYears = savedAcademicYear.isActive
    ? nextYears.map((academicYear) => ({
        ...academicYear,
        isActive: academicYear.id === savedAcademicYear.id,
      }))
    : nextYears;

  return sortAcademicYearsDescending(normalizedYears);
}

export function markActiveAcademicYear<T extends AcademicYearLike>(
  academicYears: readonly T[],
  activeAcademicYearId: number
) {
  return academicYears.map((academicYear) => ({
    ...academicYear,
    isActive: academicYear.id === activeAcademicYearId,
  }));
}
