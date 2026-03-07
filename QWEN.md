# ScholarTrack - Scholarship Tracking System

## Project Overview

**ScholarTrack** is a comprehensive web-based scholarship tracking system built with **Next.js 16**, **PostgreSQL**, and **Prisma ORM**. The system manages student records, scholarship programs, application tracking, disbursements, and generates detailed reports for educational institutions.

### Core Features

- **Student Management**: Full CRUD operations with grade levels (Grade School, Junior High, Senior High, College)
- **Scholarship Management**: Multiple scholarship types (Internal/External) including CHED, TESDA, TDP, LGU, PAED
- **Multiple Scholarships Per Student**: Students can have multiple concurrent scholarships via junction table
- **Disbursement Tracking**: Monitor scholarship payments and distributions
- **Fee Management**: Tuition, miscellaneous, laboratory, and other fees with subsidy calculations
- **Reports & Analytics**: Detailed reports grouped by grade level and scholarship type
- **Data Export**: PDF, Excel (XLSX), and CSV export capabilities
- **User Authentication**: Secure login with role-based access control (ADMIN, STAFF, VIEWER)
- **Audit Logging**: Complete activity tracking for accountability
- **Graduation Service**: Automated handling of graduating students (scholarship removal, disbursement cancellation)

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.x | React framework with App Router |
| **React** | 19.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **PostgreSQL** | - | Relational database |
| **Prisma ORM** | 6.x | Database ORM with JS engine |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **shadcn/ui** | - | Accessible UI components |
| **Radix UI** | - | Primitive components |
| **React Hook Form** | 7.x | Form management |
| **TanStack Query** | 5.x | Server state management |
| **Zod** | 3.x | Schema validation |
| **Vitest** | 4.x | Testing framework |
| **jsPDF** | 4.x | PDF generation |
| **XLSX** | 0.18.x | Excel export |

---

## Project Structure

```
scholarship-tracking-system/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Dashboard layout group
│   │   │   ├── students/       # Student management page
│   │   │   ├── scholarships/   # Scholarship management page
│   │   │   ├── reports/        # Reports and analytics
│   │   │   ├── settings/       # User settings
│   │   │   ├── layout.tsx      # Dashboard layout
│   │   │   └── page.tsx        # Dashboard home
│   │   ├── api/                # API Routes
│   │   │   ├── students/       # Student CRUD endpoints
│   │   │   ├── scholarships/   # Scholarship CRUD endpoints
│   │   │   ├── disbursements/  # Disbursement management
│   │   │   ├── export/         # PDF/CSV/XLSX exports
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── users/          # User management
│   │   │   ├── audit-logs/     # Audit log endpoints
│   │   │   ├── sessions/       # Session management
│   │   │   ├── scheduler/      # Cron job endpoints
│   │   │   └── graduation/     # Graduation processing
│   │   ├── login/              # Login page
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── forms/              # Form components (student, scholarship)
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── charts/             # Recharts visualizations
│   │   ├── layout/             # Layout components
│   │   ├── providers/          # Context providers
│   │   ├── auth/               # Auth-related components
│   │   └── shared/             # Shared/reusable components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and services
│   │   ├── auth.ts             # Authentication utilities
│   │   ├── prisma.ts           # Prisma client instance
│   │   ├── graduation-service.ts  # Graduation processing logic
│   │   ├── scholarship-validation.ts  # Validation logic
│   │   ├── backup-service.ts   # Database backup utilities
│   │   ├── scheduler.ts        # Job scheduling
│   │   ├── cron.ts             # Cron job definitions
│   │   ├── constants.ts        # App constants
│   │   └── utils.ts            # General utilities
│   └── types/                  # TypeScript type definitions
├── prisma/
│   ├── schema.prisma           # Main Prisma schema
│   ├── schema-with-erd.prisma  # Schema with ERD generator
│   ├── seed.ts                 # Database seeding script
│   └── migrations/             # Database migrations
├── docs/
│   ├── ERD.svg                 # Entity Relationship Diagram
│   ├── index.html              # Interactive ERD viewer
│   ├── README.md               # Database documentation
│   ├── RBAC-GUIDE.md           # Role-based access control guide
│   └── TANSTACK-QUERY-GUIDE.md # TanStack Query usage guide
├── tests/                      # Vitest test files
├── scripts/                    # Utility scripts
├── __tests__/                  # Additional test directory
└── changelog/                  # Changelog files
```

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| **User** | Authentication users with roles (ADMIN, STAFF, VIEWER) |
| **Session** | User login sessions with expiration |
| **AuditLog** | System activity tracking |
| **Student** | Student records with grade/year levels |
| **Scholarship** | Scholarship programs (Internal/External) |
| **StudentScholarship** | Junction table for many-to-many relationship |
| **Disbursement** | Scholarship payment tracking |
| **StudentFees** | Fee breakdown (tuition, misc, lab, etc.) |
| **Backup** | Database backup records |

### Key Relationships

- **User** → **Session** (One-to-Many)
- **User** → **AuditLog** (One-to-Many)
- **Student** ↔ **Scholarship** (Many-to-Many via StudentScholarship)
- **Student** → **StudentFees** (One-to-Many)
- **Student** → **Disbursement** (One-to-Many)
- **Scholarship** → **Disbursement** (One-to-Many)

---

## Building and Running

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** database (or use the configured Prisma Accelerate URL)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (edit .env file)
# DATABASE_URL, JWT_SECRET, SESSION_SECRET, etc.

# 3. Generate Prisma client and push schema
npx prisma db push

# 4. Seed database with sample data
npm run db:seed

# 5. Start development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 8080) |
| `npm run build` | Build for production (with Prisma generate) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run erd:generate` | Generate Entity Relationship Diagram |
| `npm run erd:view` | Open ERD viewer in browser |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |

### Environment Variables

Required variables in `.env`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-jwt-secret-min-32-chars"
SESSION_SECRET="your-session-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
SESSION_DURATION_HOURS=8
```

---

## Development Conventions

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Consistent indentation, semicolons required
- **Naming**: 
  - Components: PascalCase
  - Functions/variables: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Files: kebab-case or camelCase matching export

### Import Aliases

```typescript
import { Component } from '@/components/component-name';
import { utility } from '@/lib/utility';
import { Type } from '@/types';
```

### Testing Practices

- Tests located in `tests/` directory with `.test.ts` extension
- Use **Vitest** with globals enabled
- Mock Prisma client and external dependencies
- Test coverage uses V8 provider

Example test structure:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('service-name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionName', () => {
    it('should do something', () => {
      // Test implementation
    });
  });
});
```

### API Route Conventions

- All API routes under `src/app/api/`
- Use RESTful conventions:
  - `GET /api/students` - List all
  - `GET /api/students/[id]` - Get by ID
  - `POST /api/students` - Create
  - `PUT /api/students/[id]` - Update
  - `DELETE /api/students/[id]` - Delete

### Component Structure

```typescript
// 1. Imports (React, libraries, types)
// 2. Component props interface
// 3. Component function
// 4. Export
```

### Database Operations

- Always use Prisma transactions for multi-step operations
- Include audit logging for data modifications
- Use soft deletes (isArchived) where appropriate
- Index frequently queried columns

---

## Key Architecture Patterns

### Authentication

- JWT-based authentication with HTTP-only cookies
- Session stored in database with expiration
- Password hashing with bcryptjs
- Account lockout after 5 failed attempts (15 min)
- Role-based access control (RBAC)

### Data Flow

```
Browser → Next.js App Router → API Routes → Prisma ORM → PostgreSQL
                ↓
        React Components
                ↓
        TanStack Query (caching)
                ↓
            UI Display
```

### State Management

- **TanStack Query**: Server state (API data)
- **React Hook Form**: Form state
- **React Context**: Theme, auth providers

---

## Important Files Reference

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema definition |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/lib/auth.ts` | Authentication utilities |
| `src/lib/graduation-service.ts` | Graduation processing logic |
| `src/components/forms/` | All form components |
| `src/app/api/` | All API route handlers |
| `docs/ERD.svg` | Database entity relationship diagram |
| `SYSTEM-MANUAL.md` | Complete user documentation |

---

## Common Tasks

### Add a New API Endpoint

1. Create folder under `src/app/api/your-endpoint/`
2. Add `route.ts` with HTTP method handlers
3. Import Prisma client: `import prisma from '@/lib/prisma'`
4. Implement CRUD operations
5. Add authentication/authorization checks

### Create a New Component

1. Create file in appropriate `src/components/` subdirectory
2. Use TypeScript with proper prop typing
3. Import from `@/components/ui/` for shadcn components
4. Follow existing component patterns

### Add Database Migration

```bash
# After schema changes
npx prisma db push

# Or create named migration
npx prisma migrate dev --name your_migration_name
```

### Run Tests

```bash
# Run all tests
npm run test

# Run in watch mode
npm run test:watch

# Run specific test file
npx vitest tests/your-test.test.ts
```

---

## Troubleshooting

### Prisma Client Issues
```bash
# Regenerate Prisma client
npx prisma generate

# Reset and push schema
npx prisma db push --force-reset
```

### Build Errors
```bash
# Clear .next and node_modules
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues
- Verify `DATABASE_URL` in `.env`
- Check PostgreSQL is running
- Ensure Prisma Accelerate API key is valid

---

## Additional Resources

- **System Manual**: `SYSTEM-MANUAL.md` - Complete user guide
- **Database Docs**: `docs/README.md` - ERD and schema documentation
- **RBAC Guide**: `docs/RBAC-GUIDE.md` - Role-based access control
- **TanStack Query**: `docs/TANSTACK-QUERY-GUIDE.md` - Data fetching patterns
- **Changelog**: `CHANGELOG.md` - Recent changes and updates
