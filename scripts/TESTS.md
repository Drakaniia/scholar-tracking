# Test Scripts

This directory contains test scripts for the Scholarship Tracking System.

## Unit Tests

Run unit tests using Vitest:

```bash
# Run all tests
npm run test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch
```

### Test Files

- `src/app/api/scholarships/[id]/route.test.ts` - Unit tests for the scholarship API endpoint

## Integration Tests

Run integration tests that make actual HTTP requests to the API:

```bash
npm run test:api
```

**Prerequisites:**
- Development server must be running (`npm run dev`)
- Default admin credentials: `admin` / `admin123`

### What Integration Tests Cover

1. **GET /api/scholarships** - List all scholarships
2. **POST /api/scholarships** - Create new scholarship
3. **GET /api/scholarships/[id]** - Get single scholarship
4. **PUT /api/scholarships/[id]** - Update scholarship (full/partial)
5. **PATCH /api/scholarships/[id]** - Archive/unarchive scholarship
6. **Authorization** - Verify unauthorized access is blocked

## Test Coverage

The tests cover:

### Unit Tests
- ✅ GET endpoint - successful retrieval
- ✅ GET endpoint - 404 for not found
- ✅ GET endpoint - error handling
- ✅ PUT endpoint - successful update
- ✅ PUT endpoint - partial updates
- ✅ PUT endpoint - grant type updates
- ✅ PUT endpoint - cache invalidation
- ✅ PUT endpoint - unauthorized access (403)
- ✅ PATCH endpoint - archive action
- ✅ PATCH endpoint - unarchive action
- ✅ PATCH endpoint - invalid action (400)
- ✅ PATCH endpoint - unauthorized access (403)

### Integration Tests
- ✅ Authentication flow
- ✅ Full CRUD operations
- ✅ Partial updates (the fix for the 500 error)
- ✅ Archive functionality
- ✅ Authorization enforcement

## The 500 Error Fix

The original issue was in the PUT endpoint where the request body was passed directly to Prisma without filtering:

```typescript
// ❌ Before (caused 500 error)
const scholarship = await prisma.scholarship.update({
    where: { id: scholarshipId },
    data: body,  // Could contain undefined fields
});

// ✅ After (fixed)
const updateData: Record<string, unknown> = {};
if (body.scholarshipName !== undefined) updateData.scholarshipName = body.scholarshipName;
if (body.sponsor !== undefined) updateData.sponsor = body.sponsor;
// ... etc for each field

const scholarship = await prisma.scholarship.update({
    where: { id: scholarshipId },
    data: updateData,  // Only defined fields
});
```

This ensures that only explicitly provided fields are sent to Prisma, preventing errors from undefined or null values.
