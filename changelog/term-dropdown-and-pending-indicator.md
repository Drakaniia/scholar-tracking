# Term Dropdown and Pending Semester Indicator

**Date**: 2026-05-08  
**Type**: Feature Enhancement  
**Status**: Completed  
**Related**: Annual Fee Aggregation Feature

## Overview

Enhanced the Student Fees Manager with two key improvements:

1. **Term Dropdown**: Replaced free-text term input with a structured dropdown
2. **Pending Semester Indicator**: Visual indicator showing which semesters are missing

## Problem Statement

### Issue 1: Inconsistent Term Entry

Free-text inputs for "Term" and "Academic Year" led to:

- Inconsistent naming ("1st Semester" vs "First Semester" vs "1st sem")
- Typos and data quality issues
- Difficulty aggregating fees by term
- No validation of term values

### Issue 2: No Visibility on Missing Data

When entering fees semester-by-semester:

- No way to know which semesters were still pending
- Had to manually track what was entered
- Risk of forgetting to enter a semester
- No visual indicator of data completeness

## Solution Implemented

### 1. Term Dropdown

**Replaced free-text inputs with structured dropdowns:**

#### Term Dropdown Options:

- 1st Semester
- 2nd Semester
- Summer
- Midyear

#### Academic Year Dropdown:

- Populated from `AcademicYear` database records
- Shows format: "2025-2026 - 1ST"
- Falls back to current year if no records exist

#### Benefits:

✅ Consistent data entry  
✅ No typos or variations  
✅ Easier to aggregate and filter  
✅ Validates against actual academic year records

### 2. Pending Semester Indicator

**Added visual indicators in the Annual Summary card:**

#### What It Shows:

- **Semester Count Badge**: "2 semesters" (blue)
- **Pending Badge**: "1 pending" (yellow) - only shows if semesters are missing
- **Recorded Line**: Lists entered semesters (e.g., "1st Semester • 2nd Semester")
- **Pending Line**: Lists missing semesters (e.g., "Pending: 2nd Semester")

#### Logic:

```typescript
// Expected semesters for most schools
const expectedSemesters = ['1st Semester', '2nd Semester'];

// Calculate pending
const pending = expectedSemesters.filter((sem) => !recordedSemesters.includes(sem));
```

#### Benefits:

✅ Instant visibility on data completeness  
✅ Know exactly which semesters are missing  
✅ Prevents forgetting to enter a semester  
✅ Clear visual distinction (yellow = incomplete)

## Implementation Details

### Files Modified

1. **`src/hooks/use-queries.ts`**
   - Added `academicYears` query keys
   - Added `useAcademicYears()` hook
   - Added `useActiveAcademicYear()` hook

2. **`src/components/forms/student-fees-manager.tsx`**
   - Imported `Select` components from shadcn/ui
   - Added `useAcademicYears()` hook
   - Added `SEMESTER_OPTIONS` constant
   - Added `getPendingSemesters()` function
   - Replaced term/year text inputs with dropdowns (add form)
   - Replaced term/year text inputs with dropdowns (edit form)
   - Updated annual summary card with pending indicator

### New API Integration

The component now fetches academic years from:

```
GET /api/academic-years?limit=100
```

Response format:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "year": "2025-2026",
      "semester": "1ST",
      "startDate": "2025-08-01",
      "endDate": "2026-05-31",
      "isActive": true
    }
  ]
}
```

### UI Components Used

- `Select` from shadcn/ui
- `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
- `Badge` with custom variants (outline, yellow for pending)

## Visual Examples

### Before (Free-Text Input)

```
┌─────────────────────────────────┐
│ Term: [1st Semester________]    │
│ Academic Year: [2025-2026__]    │
└─────────────────────────────────┘
```

**Issues**: Typos, inconsistency, no validation

### After (Dropdown)

```
┌─────────────────────────────────┐
│ Term: [1st Semester ▼]          │
│   • 1st Semester                │
│   • 2nd Semester                │
│   • Summer                      │
│   • Midyear                     │
│                                 │
│ Academic Year: [2025-2026 ▼]   │
│   • 2025-2026 - 1ST             │
│   • 2024-2025 - 2ND             │
└─────────────────────────────────┘
```

**Benefits**: Consistent, validated, user-friendly

### Annual Summary - Complete Data

```
┌──────────────────────────────────────────────────┐
│ 💵 Annual Summary - 2025-2026   [2 semesters]   │
├──────────────────────────────────────────────────┤
│ Recorded: 1st Semester • 2nd Semester            │
├──────────────────────────────────────────────────┤
│ Tuition: ₱22,000  |  Total Fees: ₱22,000        │
│ Annual Subsidy: ₱15,000  |  EFC: 68.18%         │
└──────────────────────────────────────────────────┘
```

### Annual Summary - Incomplete Data

```
┌──────────────────────────────────────────────────────┐
│ 💵 Annual Summary - 2025-2026  [1 semester] [1 pending] │
├──────────────────────────────────────────────────────┤
│ Recorded: 1st Semester                               │
│ Pending: 2nd Semester                                │
├──────────────────────────────────────────────────────┤
│ Tuition: ₱11,000  |  Total Fees: ₱11,000            │
│ Annual Subsidy: ₱7,500  |  EFC: 68.18%              │
└──────────────────────────────────────────────────────┘
```

**Note**: Yellow "1 pending" badge alerts user to incomplete data

## User Workflow

### Adding Fees (1st Semester)

1. Click "Add Fees" button
2. Select "1st Semester" from Term dropdown
3. Select "2025-2026" from Academic Year dropdown
4. Enter fee amounts
5. Save

**Result**: Annual summary shows "1 semester" and "1 pending" badge

### Adding Fees (2nd Semester)

1. Click "Add Fees" button again
2. Select "2nd Semester" from Term dropdown
3. Select "2025-2026" from Academic Year dropdown
4. Enter fee amounts
5. Save

**Result**: Annual summary updates to "2 semesters", pending badge disappears

## Edge Cases Handled

### No Academic Years in Database

- Dropdown shows current year as fallback
- User can still enter fees
- System doesn't break

### Summer/Midyear Terms

- Included in dropdown options
- Not counted as "pending" (optional terms)
- Only 1st and 2nd semesters are expected

### Multiple Academic Years

- Each year gets its own annual summary card
- Each card shows its own pending status
- Independent tracking per year

## Benefits Summary

### For Data Entry Staff

✅ Faster entry with dropdowns (no typing)  
✅ No typos or inconsistencies  
✅ Clear indication of what's missing  
✅ Prevents duplicate entries

### For Administrators

✅ Consistent data for reporting  
✅ Easy to identify incomplete records  
✅ Better data quality  
✅ Accurate annual aggregations

### For System

✅ Validated data at entry point  
✅ Easier to query and filter  
✅ Reliable aggregation logic  
✅ Reduced data cleanup needs

## Testing Checklist

- [x] TypeScript compilation passes
- [x] ESLint passes with no errors
- [x] Term dropdown shows all 4 options
- [x] Academic year dropdown populates from API
- [x] Pending indicator shows when 1 semester entered
- [x] Pending indicator hides when both semesters entered
- [x] Edit form uses dropdowns (not text inputs)
- [x] Add form uses dropdowns (not text inputs)
- [x] Annual summary card displays correctly
- [x] Multiple academic years handled correctly

## Related Features

- **Annual Fee Aggregation**: Provides the data for pending calculation
- **Academic Year Management**: Source of academic year dropdown data
- **Student Fees Manager**: Parent component containing these features

## Future Enhancements (Optional)

1. **Smart Defaults**: Auto-select current academic year and next pending semester
2. **Validation**: Prevent duplicate term/year combinations
3. **Bulk Entry**: Add multiple semesters at once
4. **Expected Semester Configuration**: Allow schools to define expected semester count (2, 3, or 4)
5. **Notification**: Alert when a semester is overdue for entry

## Documentation

- **User Guide**: See `docs/ANNUAL-FEE-AGGREGATION-GUIDE.md`
- **Main Documentation**: See `AGENTS.md`
- **Related Changelog**: See `changelog/annual-fee-aggregation.md`
