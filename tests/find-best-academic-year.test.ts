import { describe, expect, it } from 'vitest';

import { findBestAcademicYearId } from '@/lib/academic-year-utils';

describe('findBestAcademicYearId', () => {
  const years = [
    { id: 1, year: '2023-2024', isActive: false },
    { id: 2, year: '2024-2025', isActive: true },
    { id: 3, year: '2025-2026', isActive: false },
  ];

  it('should use preferred ID when it exists in the list', () => {
    const result = findBestAcademicYearId(years, 1);
    expect(result).toBe(1);
  });

  it('should use active year when no preferred ID given', () => {
    const result = findBestAcademicYearId(years, null);
    expect(result).toBe(2);
  });

  it('should use active year when preferred ID is undefined', () => {
    const result = findBestAcademicYearId(years, undefined);
    expect(result).toBe(2);
  });

  it('should fall back to most recent (by year desc) when no active year', () => {
    const noActive = years.map((y) => ({ ...y, isActive: false }));
    const result = findBestAcademicYearId(noActive, null);
    // "2025-2026" is highest year string → id 3
    expect(result).toBe(3);
  });

  it('should return null when the list is empty', () => {
    const result = findBestAcademicYearId([], null);
    expect(result).toBeNull();
  });

  it('should ignore a preferred ID that is not in the list', () => {
    const result = findBestAcademicYearId(years, 999);
    expect(result).not.toBe(999);
    // Should fall back to active year
    expect(result).toBe(2);
  });
});
