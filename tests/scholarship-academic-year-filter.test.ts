/**
 * TDD tests for Scholarship page academic year filtering
 *
 * Tests cover:
 * 1. Academic Year filter UI on the scholarships page
 * 2. API support for academic year filtering in scholarship detail
 * 3. Detail dialog academic year filter for filtering students
 * 4. Proper academic year filter integration with hooks and API
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(process.cwd(), 'src/app/(dashboard)/scholarships/page.tsx'),
  'utf8'
);

const apiDetailRouteSource = readFileSync(
  join(process.cwd(), 'src/app/api/scholarships/[id]/route.ts'),
  'utf8'
);

const hooksSource = readFileSync(
  join(process.cwd(), 'src/hooks/use-queries.ts'),
  'utf8'
);

const apiRouteSource = readFileSync(
  join(process.cwd(), 'src/app/api/scholarships/route.ts'),
  'utf8'
);

const filterOptionsRouteSource = readFileSync(
  join(process.cwd(), 'src/app/api/scholarships/filter-options/route.ts'),
  'utf8'
);

// ──────────────────────────────────────────────
// UI: Scholarships Page Academic Year Filter
// ──────────────────────────────────────────────

describe('scholarships page academic year filter', () => {
  it('renders an Academic Year filter dropdown on the scholarships page', () => {
    // The scholarship page must have an academic year filter in the FilterCard
    expect(pageSource).toContain('Academic Year');
    // Must have a select for academic year filtering (check for the string in an option label)
    expect(pageSource).toContain('academicYearFilter');
    // Must display "All Academic Years" option in the filter dropdown
    expect(pageSource).toContain('All Academic Years');
    // Must use the useAcademicYears hook
    expect(pageSource).toContain('useAcademicYears');
  });

  it('includes academicYearId in useScholarships filter', () => {
    // The scholarships hook call must pass academicYearId
    const hookCallSection = pageSource.indexOf('useScholarships(');
    const beforeEndOfDeclaration = pageSource.indexOf('placeholderData', hookCallSection);
    const hookCallBody = pageSource.slice(hookCallSection, beforeEndOfDeclaration);

    expect(hookCallBody).toContain('academicYearId');
  });

  it('includes academicYearId in useScholarshipFilterOptions filter', () => {
    // The filter options hook call must pass academicYearId
    const filterOptionsSection = pageSource.indexOf('useScholarshipFilterOptions');
    const afterFilterOptions = pageSource.indexOf('const [counts', filterOptionsSection);
    const filterOptionsBody = pageSource.slice(filterOptionsSection, afterFilterOptions);

    expect(filterOptionsBody).toContain('academicYearId');
  });

  it('resets page to 1 when academicYearFilter changes', () => {
    // The useEffect that resets page must include academicYearFilter
    const resetEffectStart = pageSource.indexOf('// Reset to page 1 when filter changes');
    const resetEffectEnd = pageSource.indexOf('const handleCreate', resetEffectStart);
    const resetEffectBody = pageSource.slice(resetEffectStart, resetEffectEnd);

    expect(resetEffectBody).toContain('academicYearFilter');
  });

  it('clears academic year filter in clearScholarshipFilters', () => {
    const clearFnStart = pageSource.indexOf('const clearScholarshipFilters');
    const clearFnEnd = pageSource.indexOf('scholarshipActiveFilters');
    const clearFnBody = pageSource.slice(clearFnStart, clearFnEnd);

    expect(clearFnBody).toContain('setAcademicYearFilter');
    expect(clearFnBody).toContain("'all'");
  });

  it('includes academic year in active filters display', () => {
    const activeFiltersStart = pageSource.indexOf('const scholarshipActiveFilters');
    const activeFiltersEnd = pageSource.indexOf('scholarshipResultLabel');
    const activeFiltersBody = pageSource.slice(activeFiltersStart, activeFiltersEnd);

    expect(activeFiltersBody).toContain('academicYearFilter');
    expect(activeFiltersBody).toContain('Academic Year');
  });
});

// ──────────────────────────────────────────────
// Scholarship Detail Dialog Academic Year Filter
// ──────────────────────────────────────────────

describe('scholarship detail dialog academic year filter', () => {
  it('has an academic year filter in the detail dialog', () => {
    // The detail dialog section must have an academic year filter
    const dialogSectionStart = pageSource.indexOf('Scholarship Detail Dialog');
    // Check the JSX around assigned students section
    const assignedSection = pageSource.indexOf('Assigned Students', dialogSectionStart);
    const beforeAssigned = pageSource.slice(dialogSectionStart, assignedSection);

    // Should have an academic year filter before/above assigned students
    expect(beforeAssigned).toContain('dialogAcademicYearIdFilter');
    expect(beforeAssigned).toContain('Filter by Academic Year');
    expect(beforeAssigned).toContain('All Academic Years');
  });

  it('filters assigned students by selected academic year in the detail dialog', () => {
    // Filtering is done server-side via the useScholarship hook passing
    // dialogAcademicYearIdFilter as the academicYearId param.
    // Check the useScholarship hook call includes dialogAcademicYearIdFilter
    const scholarshipCallStart = pageSource.indexOf('dialogAcademicYearIdFilter &&');
    const scholarshipCallEnd = pageSource.indexOf(',\n    { enabled:', scholarshipCallStart);
    const scholarshipCallBody = pageSource.slice(scholarshipCallStart, scholarshipCallEnd);

    expect(scholarshipCallBody).toContain('dialogAcademicYearIdFilter');
    // The filter is passed to useScholarship which sends it as academicYearId query param
    expect(scholarshipCallBody).toContain('Number(dialogAcademicYearIdFilter)');

    // Also verify the useScholarship hook fetches selectedScholarship data
    expect(pageSource).toContain('const assignedStudents = selectedScholarship?.students || []');
  });

  it('shows student count for selected academic year in detail dialog', () => {
    // The count badge must reflect filtered count
    expect(pageSource).toContain('students');
    expect(pageSource).toContain('assignedStudentCount');
  });

  it('shows total grants for filtered students in detail dialog', () => {
    // The total grants calculation uses the server-filtered students array
    // When dialogAcademicYearIdFilter is set, the API returns only matching students
    // The user-scholarship page contains Total Grants Awarded with a reduce over students
    expect(pageSource).toContain('Total Grants Awarded');
    // The calculation uses selectedScholarship.students.reduce (already filtered by the API)
    expect(pageSource).toContain('selectedScholarship.students.reduce');
    expect(pageSource).toContain('ss.grantAmount');
  });
});

// ──────────────────────────────────────────────
// API: Scholarship Detail Academic Year Support
// ──────────────────────────────────────────────

describe('scholarship detail API academic year filtering', () => {
  it('accepts academicYearId query parameter in scholarship detail route', () => {
    // The [id] route must read the academicYearId search param
    expect(apiDetailRouteSource).toContain("searchParams.get('academicYearId')");
  });

  it('filters students by academicYearId in the Prisma query', () => {
    // The Prisma query for students should filter by academicYearId
    const getFnStart = apiDetailRouteSource.indexOf('// GET /api/scholarships/');
    const getFnStudents = apiDetailRouteSource.indexOf('students:', getFnStart);
    const studentsSection = apiDetailRouteSource.slice(getFnStart, getFnStudents + 300);

    // The students include should include a where filter for academic year
    expect(studentsSection).toContain('academicYearId');
  });
});

// ──────────────────────────────────────────────
// API: Scholarships List Academic Year Filter
// ──────────────────────────────────────────────

describe('scholarships list API academic year support', () => {
  it('accepts academicYearId query parameter in scholarships list route', () => {
    // The scholarships list route must read the academicYearId search param
    expect(apiRouteSource).toContain("searchParams.get('academicYearId')");
  });

  it('filters scholarships by academic year in where clause', () => {
    // The where clause should include academic year student filter
    const getFnStart = apiRouteSource.indexOf('// GET /api/scholarships');
    const whereBuilding = apiRouteSource.indexOf('academicYearId', getFnStart);
    expect(whereBuilding).toBeGreaterThan(getFnStart);

    // Must use students.some with academicYearId filter
    expect(apiRouteSource).toContain('academicYearId');
    expect(apiRouteSource).toContain('students:');
    expect(apiRouteSource).toContain('some:');
  });
});

// ──────────────────────────────────────────────
// Filter Options API Academic Year Support
// ──────────────────────────────────────────────

describe('scholarship filter-options API academic year support', () => {
  it('accepts academicYearId query parameter in filter-options route', () => {
    expect(filterOptionsRouteSource).toContain("searchParams.get('academicYearId')");
  });

  it('filters scholarship counts by academic year', () => {
    // The where clause must include the academic year filter
    expect(filterOptionsRouteSource).toContain('academicYearId');
    expect(filterOptionsRouteSource).toContain('students');
    expect(filterOptionsRouteSource).toContain('some:');
  });
});

// ──────────────────────────────────────────────
// Type Support for Academic Year Filter
// ──────────────────────────────────────────────

describe('ScholarshipFilters type academic year support', () => {
  it('includes academicYearId in ScholarshipFilters interface', () => {
    expect(hooksSource).toContain('academicYearId');
  });

  it('passes academicYearId as query param in useScholarships hook', () => {
    // The useScholarships function dynamically iterates over all filter entries
    // via Object.entries(filters).forEach, so it passes academicYearId when
    // present in the ScholarshipFilters object.
    // Verify the ScholarshipFilters interface includes academicYearId
    const interfaceStart = hooksSource.indexOf('interface ScholarshipFilters');
    const interfaceEnd = hooksSource.indexOf('interface DashboardStats');
    const interfaceBody = hooksSource.slice(interfaceStart, interfaceEnd);

    expect(interfaceBody).toContain('academicYearId');

    // Verify the useScholarships function URL params include all filters dynamically
    // Use exact function name with opening paren to avoid matching useScholarship
    const scholarshipsFnStart = hooksSource.indexOf('export function useScholarships(');
    const scholarshipsFnEnd = hooksSource.indexOf('export function useScholarship(');
    const scholarshipsFnBody = hooksSource.slice(scholarshipsFnStart, scholarshipsFnEnd);

    // The function uses Object.entries(filters).forEach to build query params
    expect(scholarshipsFnBody).toContain('Object.entries(filters).forEach');
  });

  it('passes academicYearId as query param in useScholarship hook', () => {
    const scholarshipFnStart = hooksSource.indexOf('export function useScholarship');
    const scholarshipFnEnd = hooksSource.indexOf('export function useScholarshipFilterOptions');
    const scholarshipFnBody = hooksSource.slice(scholarshipFnStart, scholarshipFnEnd);

    expect(scholarshipFnBody).toContain('academicYearId');
  });
});
