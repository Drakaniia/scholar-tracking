# Implementation Plan: Fix Student Fee Persistence Issue + E2E Tests

## Root Cause

The bug is in `src/app/(dashboard)/students/page.tsx`:

- **Line 51-72**: `StudentMutationData` type is missing the `fees` field
- **Line 249-269**: `handleFormSubmit` creates `mutationData` object that excludes `fees`

The `StudentForm` component properly collects fee data and includes it in `submitData.fees`, but the page's `handleFormSubmit` function discards it before sending to the API.

## Implementation Steps

### Phase 1: Fix the Bug (2 changes)

**1. Update `StudentMutationData` type** (`src/app/(dashboard)/students/page.tsx:51-72`)

- Add optional `fees` field with type matching `StudentFeesInput`

**2. Update `handleFormSubmit`** (`src/app/(dashboard)/students/page.tsx:249-269`)

- Add `fees: data.fees` to the `mutationData` object

### Phase 2: Add Test Attributes

**3. Add data-testid attributes** for Playwright tests:

- `src/components/forms/student-form.tsx`: Add to fee input fields (tuition, misc, lab, other)
- `src/app/(dashboard)/students/page.tsx`: Add to edit button and save button

### Phase 4: Verify

**8. Run tests:**

- `npm run typecheck` - Verify no TypeScript errors

## Expected Outcome

- Fee values will persist correctly when editing students
