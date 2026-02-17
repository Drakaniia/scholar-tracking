# AGENTS.md

This guide contains essential information for agentic coding agents working on the Scholarship Tracking System.

## Commands

### Development
- `npm run dev` - Start development server with webpack
- `npm run build` - Build production release (generates Prisma client first)
- `npm run start` - Start production server

### Code Quality
- `npm run lint` - Run ESLint on the codebase
- **Note: No test framework is currently configured**

### Database
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio for database management
- `npm run erd:generate` - Generate Entity Relationship Diagram
- `npm run erd:view` - View ERD in browser (opens `docs/index.html`)

### Utility
- `npm run clean` - Clean node_modules and .next, then reinstall

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript 5 (strict mode enabled)
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Tailwind CSS v4.1.18 + shadcn/ui components
- **Auth**: Custom JWT implementation with bcryptjs
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Styling**: Tailwind CSS v4.1.18 + shadcn/ui components

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Dashboard layout group
│   ├── api/               # API routes
│   └── login/             # Authentication pages
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   ├── forms/             # Form components
│   ├── dashboard/         # Dashboard-specific components
│   ├── charts/            # Chart components
│   ├── shared/            # Shared/reusable components
│   └── auth/              # Authentication components
├── lib/                   # Utilities and configurations
├── types/                 # TypeScript type definitions
└── hooks/                 # Custom React hooks
```

## Code Style Guidelines

### Imports
1. External libraries first
2. Internal imports using `@/` alias
3. Group imports by type (React, third-party, internal)
4. Use named imports when possible

```typescript
// External libraries
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Internal imports
import { CreateStudentInput } from '@/types';
import { getSession } from '@/lib/auth';
```

### Component Structure
1. Use functional components with TypeScript
2. Destructure props at the top
3. Use `cn()` utility for conditional classes
4. Follow shadcn/ui component patterns

```typescript
function Component({
  className,
  variant = "default",
  ...props
}: ComponentProps) {
  const Comp = asChild ? Slot : "button";
  
  return (
    <Comp
      className={cn(buttonVariants({ variant, className }))}
      {...props}
    />
  );
}
```

### API Routes
1. Export HTTP method functions (GET, POST, PUT, DELETE)
2. Always wrap in try-catch blocks
3. Return consistent response format with `success`, `data`, `error` fields
4. Use proper HTTP status codes
5. Include authentication checks for protected routes

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // ... logic here
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Operation successful',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform operation' },
      { status: 500 }
    );
  }
}
```

### TypeScript
1. Always type function parameters and return values
2. Use interfaces for object shapes
3. Prefer union types over enums
4. Use `Partial<T>` for update operations
5. Define types in `src/types/index.ts`

### Database
1. Use Prisma client from `@/lib/prisma`
2. Include select clauses to limit returned data
3. Use transactions for multiple operations
4. Implement caching with `@/lib/query-optimizer`
5. Follow the defined schema in `prisma/schema.prisma`

### Error Handling
1. Always wrap async operations in try-catch
2. Log errors to console
3. Return user-friendly error messages
4. Use appropriate HTTP status codes:
   - 400: Bad Request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 500: Internal Server Error

### Styling
1. Use Tailwind classes
2. Follow light mode patterns
3. Use shadcn/ui components when available
4. Implement responsive design with mobile-first approach
5. Use CSS-in-JS only for complex animations (GSAP)

### Forms
1. Use React Hook Form with Zod schemas
2. Define validation schemas in `src/lib/validations.ts`
3. Use controlled components
4. Handle loading and error states
5. Implement proper accessibility

### Naming Conventions
1. **Files**: kebab-case (e.g., `student-form.tsx`)
2. **Components**: PascalCase (e.g., `StudentForm`)
3. **Variables**: camelCase
4. **Constants**: UPPER_SNAKE_CASE
5. **Database tables**: snake_case (mapped with @@map)
6. **API routes**: kebab-case (e.g., `/api/students/[id]`)

### Performance
1. Implement caching using `@/lib/cache.ts`
2. Use Next.js caching headers for API responses
3. Optimize images with next/image
4. Use dynamic imports for large components
5. Implement proper pagination for large datasets

### Authentication
1. Use JWT tokens stored in HTTP-only cookies
2. Verify sessions with `getSession()`
3. Check user roles for authorization
4. Implement RBAC patterns
5. Handle session expiration properly

### Exports/Reports
1. PDF generation with jsPDF
2. CSV/Excel export with xlsx
3. Client-side generation for better UX
4. Include proper headers and metadata
5. Format data for locale (en-PH)

## Database Patterns

When working with Prisma:
1. Always use the client singleton from `@/lib/prisma`
2. Include relations explicitly when needed
3. Use `select` to limit returned fields
4. Implement proper indexes for query optimization
5. Handle database errors with try-catch

## Security

1. Never log sensitive information (passwords, tokens)
2. Validate all user inputs
3. Sanitize data before rendering
4. Use parameterized queries (handled by Prisma)
5. Implement CSRF protection via Next.js defaults
6. Secure JWT with strong secret keys