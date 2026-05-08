# Annual Fee Aggregation Guide

## Overview

The Annual Fee Aggregation feature automatically sums fees across all semesters of an academic year, providing accurate annual totals and Expected Family Contribution (EFC) calculations.

## Why This Feature Matters

### The Problem

When entering fees semester-by-semester (as they occur), you need to see:

- **Annual total fees** across all semesters
- **Annual total subsidy** from scholarships
- **Accurate EFC percentage** based on complete annual data

### The Solution

The system now automatically aggregates all semester fees by academic year, showing you the complete annual picture while still allowing per-semester data entry.

---

## How It Works

### Data Entry (Per Semester)

You continue to enter fees **one semester at a time** as they occur:

**1st Semester Entry:**

- Tuition: ₱11,000
- Subsidy: ₱7,500
- Term: "1st Semester"
- Academic Year: "2025-2026"

**2nd Semester Entry:**

- Tuition: ₱11,000
- Subsidy: ₱7,500
- Term: "2nd Semester"
- Academic Year: "2025-2026"

### Automatic Aggregation

The system automatically calculates:

- **Annual Tuition**: ₱11,000 + ₱11,000 = **₱22,000**
- **Annual Subsidy**: ₱7,500 + ₱7,500 = **₱15,000**
- **Annual EFC**: ₱15,000 ÷ ₱22,000 = **68.18%**

---

## Where to View Annual Data

### 1. Reports Page (`/reports`)

The reports page now shows **annual aggregated data** for each student.

#### What You'll See:

- **Tuition Column**: Annual total (sum of all semesters)
- **Misc/Lab/Other Columns**: Annual totals
- **Total Fees**: Annual sum
- **Amount Subsidy**: Annual total subsidy
- **% Subsidy**: Calculated from annual totals
- **EFC**: Annual EFC percentage
- **Semester Count Badge**: Shows "2 sem" when multiple semesters recorded

#### Example Row:

```
Student Name: Juan Dela Cruz
Tuition: ₱22,000 (annual)
Total Fees: ₱22,000 (annual)
Amount Subsidy: ₱15,000 (annual)
% Subsidy: 68.18%
No. of Students: 1 [2 sem]  ← Badge indicates 2 semesters
EFC: 68.18%
```

### 2. Student Detail Page (`/students`)

When viewing a student's details, you'll see a new **Annual Summary Card**.

#### How to Access:

1. Click on any student in the students list
2. Click "Show Full Details" button
3. Scroll to "Fee Information" section
4. See the blue **Annual Summary** card at the top

#### What the Card Shows:

```
┌─────────────────────────────────────────────────────────┐
│ 💵 Annual Summary - 2025-2026          [2 semesters]   │
├─────────────────────────────────────────────────────────┤
│ 1st Semester • 2nd Semester                             │
├─────────────────────────────────────────────────────────┤
│ Tuition    Misc      Lab       Other     Total Fees     │
│ ₱22,000    ₱0       ₱0        ₱0        ₱22,000        │
├─────────────────────────────────────────────────────────┤
│ Annual Subsidy                    EFC                   │
│ ₱15,000                          68.18%                 │
└─────────────────────────────────────────────────────────┘
```

#### Below the Summary:

- Individual semester records remain visible and editable
- You can still add/edit each semester independently
- Changes automatically update the annual summary

---

## Use Cases

### Use Case 1: Entering Fees Progressively

**Scenario**: You're entering fees as each semester begins.

**Step 1 - After 1st Semester:**

- Enter 1st semester fees: ₱11,000 tuition, ₱7,500 subsidy
- **Reports show**: ₱11,000 tuition, ₱7,500 subsidy, 68.18% EFC
- **Annual Summary shows**: "1 semester" badge
- **Interpretation**: Partial data, 2nd semester pending

**Step 2 - After 2nd Semester:**

- Enter 2nd semester fees: ₱11,000 tuition, ₱7,500 subsidy
- **Reports show**: ₱22,000 tuition, ₱15,000 subsidy, 68.18% EFC, "2 sem" badge
- **Annual Summary shows**: "2 semesters" badge, annual totals
- **Interpretation**: Complete annual data

### Use Case 2: Calculating True EFC

**Scenario**: You need to know the actual Expected Family Contribution for the entire year.

**Without Annual Aggregation:**

- Only see 1st semester: ₱7,500 subsidy ÷ ₱11,000 fees = 68.18%
- But this doesn't reflect the full year commitment

**With Annual Aggregation:**

- See annual total: ₱15,000 subsidy ÷ ₱22,000 fees = 68.18%
- Accurate representation of annual scholarship coverage
- Even if only 1 semester entered, you know it's partial data

### Use Case 3: Multi-Year Tracking

**Scenario**: A student has fees for multiple academic years.

**What You'll See:**

- **Student Detail Page**: Separate annual summary cards for each year
  - 2024-2025: Shows annual totals for that year
  - 2025-2026: Shows annual totals for current year
- **Reports Page**: Shows most recent academic year's data
- **Benefit**: Track how fees and subsidies change year-over-year

---

## Understanding the Semester Count Badge

The small badge in the "No. of Students" column tells you data completeness:

| Display        | Meaning                                  |
| -------------- | ---------------------------------------- |
| `1` (no badge) | Only 1 semester recorded                 |
| `1 [2 sem]`    | 2 semesters recorded (typical full year) |
| `1 [3 sem]`    | 3 semesters recorded (trimester system)  |

This helps you quickly identify:

- ✅ Students with complete annual data
- ⚠️ Students with partial data (pending semesters)

---

## Frequently Asked Questions

### Q: Do I need to change how I enter fees?

**A:** No. Continue entering fees semester-by-semester as you always have. The aggregation happens automatically.

### Q: What if I only have 1 semester entered?

**A:** The system will show that semester's data with a "1 semester" indicator. The EFC will be calculated from available data, but you'll know it's incomplete.

### Q: Can I still edit individual semester records?

**A:** Yes. All individual semester records remain editable. Changes automatically update the annual summary.

### Q: What if fees differ between semesters?

**A:** The system sums whatever you enter. If 1st semester is ₱11,000 and 2nd semester is ₱12,000, the annual total will be ₱23,000.

### Q: How does this work with trimester systems?

**A:** It works the same way. If you enter 3 semesters, the system will sum all 3 and show "3 sem" badge.

### Q: What happens to old data?

**A:** All existing fee records are automatically included in the aggregation. No data migration needed.

### Q: Can I see individual semester breakdowns?

**A:** Yes. In the student detail page, scroll below the annual summary card to see all individual semester records.

---

## Benefits Summary

### For Administrators

- ✅ Accurate annual EFC calculations
- ✅ Quick identification of incomplete data
- ✅ Better budget planning with annual totals
- ✅ Multi-year trend analysis

### For Data Entry Staff

- ✅ No change to workflow (still enter per semester)
- ✅ Automatic calculations reduce errors
- ✅ Visual feedback on data completeness
- ✅ Easy to spot missing semesters

### For Reporting

- ✅ Annual totals for accurate reporting
- ✅ Consistent EFC calculations
- ✅ Transparency on data completeness
- ✅ Export-ready annual summaries

---

## Technical Notes

### Aggregation Logic

```
For each student:
  1. Group all fee records by academic year
  2. Sum tuition, misc, lab, other fees per year
  3. Sum subsidies per year
  4. Calculate: EFC = (annual subsidy ÷ annual total fees) × 100
  5. Count semesters per year
```

### Performance

- Aggregation happens at query time (no pre-computation)
- No impact on data entry speed
- Efficient database queries with proper indexing
- Cached results for fast report loading

### Data Integrity

- Individual semester records remain unchanged
- No data loss or modification
- Fully reversible (can always see per-semester data)
- Backward compatible with existing data

---

## Related Documentation

- **Change Log**: `changelog/annual-fee-aggregation.md`
- **System Manual**: `SYSTEM-MANUAL.md`
- **Performance Guide**: `docs/PERFORMANCE-OPTIMIZATION.md`
- **Main Documentation**: `AGENTS.md`
