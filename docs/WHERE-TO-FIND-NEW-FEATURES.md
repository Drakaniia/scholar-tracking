# Where to Find the New Features

Quick visual guide showing exactly where to see the annual fee aggregation, term dropdowns, and pending semester indicators.

---

## 1. Reports Page - Annual Aggregated Data

**Path**: `/reports` (click "Reports" in sidebar)

### What Changed:

All fee amounts now show **annual totals** instead of single-semester data.

### Visual Guide:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📊 Detailed Student Scholarship Report                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ COLLEGE                                                              │
│ ├─ CHED Scholarship                                                  │
│ │                                                                    │
│ │  Last Name │ First Name │ Tuition │ Total Fees │ Subsidy │ EFC   │
│ │  ──────────┼────────────┼─────────┼────────────┼─────────┼────── │
│ │  Dela Cruz │ Juan       │ ₱22,000 │ ₱22,000    │ ₱15,000 │ 68.18%│
│ │                                                    ↑         ↑     │
│ │                                          ANNUAL TOTALS (not per sem)│
│ │                                                                    │
│ │  No. of Students: 1 [2 sem] ← NEW: Semester count badge          │
│ │                      ↑                                             │
│ │                Shows how many semesters included                   │
│ └────────────────────────────────────────────────────────────────── │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Changes:

- **Tuition**: Sum of all semesters (₱11k + ₱11k = ₱22k)
- **Subsidy**: Sum of all semesters (₱7.5k + ₱7.5k = ₱15k)
- **EFC**: Calculated from annual totals (15k ÷ 22k = 68.18%)
- **Badge**: Shows "2 sem" when multiple semesters recorded

---

## 2. Student Detail Page - Annual Summary Card

**Path**: `/students` → Click any student → "Show Full Details" → Scroll to "Fee Information"

### What's New:

A prominent blue card showing annual summary with pending indicator.

### Visual Guide:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Student: Juan Dela Cruz                                              │
├─────────────────────────────────────────────────────────────────────┤
│ [Show Full Details ▼]                                                │
│                                                                      │
│ ─── Fee Information ───                                              │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 💵 Annual Summary - 2025-2026    [2 semesters] [1 pending]     │ │
│ │                                      ↑              ↑            │ │
│ │                                   Count        Missing data      │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ Recorded: 1st Semester                                          │ │
│ │ Pending: 2nd Semester  ← Shows which semesters are missing      │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ Tuition    Misc      Lab       Other     Total Fees             │ │
│ │ ₱11,000    ₱0       ₱0        ₱0        ₱11,000                │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ Annual Subsidy                    EFC                           │ │
│ │ ₱7,500                           68.18%                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ [+ Add Fees]  ← Click to add missing semester                       │
│                                                                      │
│ ─── Individual Semester Records ───                                  │
│ (Existing fee cards shown below)                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Features:

- **Blue Card**: Annual summary for each academic year
- **Semester Count**: Shows how many semesters recorded
- **Pending Badge**: Yellow badge when semesters are missing
- **Pending Line**: Lists which specific semesters are missing
- **Annual Totals**: All fees summed across semesters
- **EFC**: Accurate annual percentage

---

## 3. Add Fees Form - Term Dropdown

**Path**: `/students` → Click student → "Show Full Details" → "Fee Information" → Click "[+ Add Fees]"

### What Changed:

Free-text inputs replaced with structured dropdowns.

### Before (Old):

```
┌─────────────────────────────────────┐
│ Add New Fee Record                  │
├─────────────────────────────────────┤
│ Term: [1st Semester________]        │  ← Free text (typos possible)
│ Academic Year: [2025-2026__]        │  ← Free text (inconsistent)
└─────────────────────────────────────┘
```

### After (New):

```
┌─────────────────────────────────────┐
│ Add New Fee Record                  │
├─────────────────────────────────────┤
│ Term: [1st Semester ▼]              │  ← Dropdown (click to open)
│   ┌─────────────────────────────┐   │
│   │ • 1st Semester              │   │
│   │ • 2nd Semester              │   │
│   │ • 3rd Semester              │   │
│   └─────────────────────────────┘   │
│                                     │
│ Academic Year: [2025-2026 ▼]       │  ← Dropdown (from database)
│   ┌─────────────────────────────┐   │
│   │ • 2025-2026 - 1ST           │   │
│   │ • 2024-2025 - 2ND           │   │
│   └─────────────────────────────┘   │
│                                     │
│ Tuition Fee: [₱ 11,000.00]         │
│ Subsidy: [₱ 7,500.00]              │
│                                     │
│ [Cancel] [Save Fees]                │
└─────────────────────────────────────┘
```

### Benefits:

- ✅ No typos (select from list)
- ✅ Consistent naming
- ✅ Faster entry
- ✅ Validated data

---

## 4. Edit Fees Form - Term Dropdown

**Path**: `/students` → Click student → "Show Full Details" → "Fee Information" → Click "[Edit]" on any fee card

### What Changed:

Same dropdown improvements as the add form.

### Visual:

```
┌─────────────────────────────────────┐
│ Editing: 1st Semester 2025-2026     │
├─────────────────────────────────────┤
│ Term: [1st Semester ▼]              │  ← Dropdown (was text input)
│ Academic Year: [2025-2026 ▼]        │  ← Dropdown (was text input)
│                                     │
│ Tuition Fee: [₱ 11,000.00]         │
│ Subsidy: [₱ 7,500.00]              │
│                                     │
│ [Cancel] [Save]                     │
└─────────────────────────────────────┘
```

---

## 5. Complete Data vs Incomplete Data

### Scenario A: Only 1st Semester Entered

```
┌─────────────────────────────────────────────────────────────┐
│ 💵 Annual Summary - 2025-2026    [1 semester] [1 pending]  │  ← Yellow badge
├─────────────────────────────────────────────────────────────┤
│ Recorded: 1st Semester                                      │
│ Pending: 2nd Semester  ← Warning: data incomplete           │
├─────────────────────────────────────────────────────────────┤
│ Total Fees: ₱11,000  |  Subsidy: ₱7,500  |  EFC: 68.18%   │
│                                                             │
│ ⚠️ Note: This shows partial annual data (1 of 2 semesters) │
└─────────────────────────────────────────────────────────────┘
```

### Scenario B: Both Semesters Entered

```
┌─────────────────────────────────────────────────────────────┐
│ 💵 Annual Summary - 2025-2026         [2 semesters]        │  ← No pending badge
├─────────────────────────────────────────────────────────────┤
│ Recorded: 1st Semester • 2nd Semester                       │
│ (No pending semesters)                                      │
├─────────────────────────────────────────────────────────────┤
│ Total Fees: ₱22,000  |  Subsidy: ₱15,000  |  EFC: 68.18%  │
│                                                             │
│ ✅ Complete annual data                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: Where to See What

| Feature                    | Location                         | What to Look For                           |
| -------------------------- | -------------------------------- | ------------------------------------------ |
| **Annual Totals**          | Reports page                     | Fee columns show sums, not single semester |
| **Semester Count Badge**   | Reports page                     | "2 sem" badge in "No. of Students" column  |
| **Annual Summary Card**    | Student detail → Fee Information | Blue card at top of fees section           |
| **Pending Indicator**      | Annual summary card              | Yellow "1 pending" badge                   |
| **Pending List**           | Annual summary card              | "Pending: 2nd Semester" text               |
| **Term Dropdown**          | Add/Edit fees form               | Dropdown instead of text input             |
| **Academic Year Dropdown** | Add/Edit fees form               | Dropdown populated from database           |

---

## Navigation Paths

### To See Annual Totals in Reports:

1. Click "Reports" in sidebar
2. Look at any student row
3. Fee columns show annual sums
4. Look for "2 sem" badge in last columns

### To See Annual Summary Card:

1. Click "Students" in sidebar
2. Click any student name
3. Click "Show Full Details" button
4. Scroll to "Fee Information" section
5. Blue card appears at top

### To Use Term Dropdown:

1. Go to student detail (as above)
2. Click "[+ Add Fees]" button
3. Click "Term" dropdown
4. Select from 4 options
5. Click "Academic Year" dropdown
6. Select from available years

---

## Color Coding

| Color     | Meaning                              |
| --------- | ------------------------------------ |
| 🔵 Blue   | Annual summary card (informational)  |
| 🟡 Yellow | Pending semester indicator (warning) |
| 🟢 Green  | Subsidy amounts (positive)           |
| ⚪ White  | Regular data display                 |

---

## Tips for Users

### For Data Entry:

1. **Always check the pending indicator** after entering a semester
2. **Use dropdowns** to avoid typos
3. **Enter semesters as they occur** (don't wait for the year to end)
4. **Watch for yellow badges** - they mean data is incomplete

### For Reporting:

1. **Reports page shows annual totals** - use this for year-end reports
2. **Check semester count badges** - ensure data completeness
3. **Student detail shows breakdown** - use this to verify individual records
4. **EFC is always annual** - calculated from complete year data

---

## Common Questions

**Q: Where do I see if a semester is missing?**  
A: Student detail page → Annual Summary card → Look for yellow "pending" badge

**Q: Where do I see annual totals?**  
A: Reports page (all columns) OR Student detail page (Annual Summary card)

**Q: How do I add a missing semester?**  
A: Student detail → Click "[+ Add Fees]" → Select the missing semester from dropdown

**Q: Where did the text inputs go?**  
A: Replaced with dropdowns in both Add and Edit forms for better data quality

---

**Need Help?** See `docs/ANNUAL-FEE-AGGREGATION-GUIDE.md` for detailed user guide.
