# ScholarTrack - Scholarship Tracking System

## Project Overview

**ScholarTrack** is a comprehensive web-based scholarship management system built with Next.js 16, designed to streamline scholarship-related activities for educational institutions. The system provides complete CRUD operations for student records, scholarship programs, application tracking, and detailed reporting with export capabilities.

### Core Features

- **Dashboard**: Statistics overview, recent applications, deadline tracking, and distribution charts
- **Student Management**: Full CRUD with education levels (Grade School through College)
- **Scholarship Management**: Internal (PAED) and External (CHED, TESDA, TDP, LGU) scholarships
- **Application Tracking**: Student-scholarship assignments with approval workflow
- **Fee & Disbursement Tracking**: Detailed tuition breakdown and subsidy calculations
- **Reports & Analytics**: Comprehensive reports organized by grade level and scholarship type
- **Data Export**: PDF, Excel (XLSX), and CSV export functionality
- **Role-Based Access Control**: ADMIN, STAFF, and VIEWER roles with audit logging
- **Authentication**: JWT-based auth with HTTP-only cookies, account lockout protection

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | React framework with App Router |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **PostgreSQL** | 14+ | Relational database |
| **Prisma ORM** | 6.19.2 | Database toolkit & migrations |
| **Tailwind CSS** | 4.1.18 | Utility-first styling |
| **shadcn/ui** | - | Accessible UI components |
| **React Hook Form** | 7.70.0 | Form management |
| **Zod** | 3.24.1 | Schema validation |
| **jose** | 5.10.0 | JWT authentication |
| **bcryptjs** | 2.4.3 | Password hashing |
| **Recharts** | 3.7.0 | Data visualization |
| **jsPDF** | 4.0.0 | PDF generation |
| **xlsx** | 0.18.5 | Excel/CSV export |

---

## Building and Running

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud-hosted)
- npm or yarn package manager

### Environment Setup

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/scholarship_db"
JWT_SECRET="your-secure-secret-key-min-32-characters"
SESSION_SECRET="your-session-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# Security Settings
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
SESSION_DURATION_HOURS=8
```

### Development Server

```bash
# Install dependencies
npm install

# Setup database (push schema)
npm run db:push

# Seed database with sample data
npm run db:seed

# Start development server (runs on port 8080)
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:push` | Push Prisma schema changes to database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio (visual database editor) |
| `npm run erd:generate` | Generate Entity Relationship Diagram |
| `npm run erd:view` | View ERD in browser |

### Utility Commands

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint |
| `npm run clean` | Clean node_modules and .next, then reinstall |

---

## Project Structure

```
scholarship-tracking-system/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   ├── seed.ts                # Database seeding script
│   └── schema-with-erd.prisma # Schema with ERD generator
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Dashboard layout group
│   │   │   ├── page.tsx       # Dashboard home
│   │   │   ├── students/      # Student management
│   │   │   ├── scholarships/  # Scholarship management
│   │   │   ├── reports/       # Reports & analytics
│   │   │   └── settings/      # User settings
│   │   ├── api/
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── students/      # Student CRUD API
│   │   │   ├── scholarships/  # Scholarship CRUD API
│   │   │   ├── export/        # PDF/CSV export API
│   │   │   ├── dashboard/     # Dashboard stats API
│   │   │   └── users/         # User management API
│   │   ├── login/             # Login page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── layout/            # Layout components
│   │   ├── forms/             # Form components
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── charts/            # Chart components
│   │   ├── shared/            # Reusable components
│   │   └── auth/              # Auth-related components
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # Authentication utilities
│   │   ├── validations.ts     # Zod schemas
│   │   ├── cache.ts           # Caching utilities
│   │   └── utils.ts           # General utilities
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript type definitions
│   └── assets/                # Static assets
├── docs/
│   ├── ERD.svg                # Entity Relationship Diagram
│   ├── index.html             # Interactive ERD viewer
│   ├── README.md              # Database documentation
│   └── RBAC-GUIDE.md          # Role-based access guide
├── .env                       # Environment variables
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
└── vercel.json                # Vercel deployment config
```

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| **User** | Authentication users with roles (ADMIN, STAFF, VIEWER) |
| **Session** | User login sessions with expiration tracking |
| **AuditLog** | System activity logging for accountability |
| **Student** | Student records with education level tracking |
| **Scholarship** | Scholarship programs (PAED, CHED, LGU types) |
| **StudentScholarship** | Junction table for student-scholarship assignments |
| **StudentFees** | Fee breakdown (tuition, misc, lab) with subsidy calculations |
| **Disbursement** | Payment tracking for scholarship distributions |

### Key Relationships

- **User** → **Session** (One-to-Many)
- **User** → **AuditLog** (One-to-Many)
- **Student** → **StudentScholarship** (One-to-Many)
- **Scholarship** → **StudentScholarship** (One-to-Many)
- **Student** → **StudentFees** (One-to-Many)
- **Student** → **Disbursement** (One-to-Many)

View the complete ERD at `docs/ERD.svg` or run `npm run erd:view`.

---

## Development Conventions

### Code Style

- **Files**: kebab-case (`student-form.tsx`)
- **Components**: PascalCase (`StudentForm`)
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Database tables**: snake_case (mapped with Prisma `@@map`)

### Import Order

1. External libraries (React, Next.js, third-party)
2. Internal imports using `@/` alias
3. Relative imports

```typescript
// External
import { NextRequest, NextResponse } from 'next/server';
import { useForm } from 'react-hook-form';

// Internal
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Relative
import { Button } from './ui/button';
```

### Component Pattern

```typescript
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  variant?: 'default' | 'outline';
}

export function Component({
  className,
  variant = 'default',
  ...props
}: Props) {
  return (
    <div className={cn('base-styles', className)}>
      {/* content */}
    </div>
  );
}
```

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await prisma.student.findMany();
    
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Authentication

- JWT tokens stored in HTTP-only cookies
- Session duration: 8 hours (configurable)
- Account lockout after 5 failed attempts (15 min lockout)
- Role-based access control (RBAC)
- Audit logging for all CRUD operations

### TypeScript Guidelines

- Strict mode enabled
- Always type function parameters and return values
- Use interfaces for object shapes
- Use `Partial<T>` for update operations
- Define types in `src/types/index.ts`

### Error Handling

- Wrap async operations in try-catch
- Log errors to console
- Return consistent API response format: `{ success, data?, error? }`
- Use appropriate HTTP status codes (400, 401, 403, 404, 500)

### Styling

- Use Tailwind CSS utility classes
- Use `cn()` utility for conditional classes
- Mobile-first responsive design
- shadcn/ui components as base primitives

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/session` | Get current session |

### Students

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | List all students |
| POST | `/api/students` | Create new student |
| GET | `/api/students/:id` | Get student by ID |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |

### Scholarships

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scholarships` | List all scholarships |
| POST | `/api/scholarships` | Create scholarship |
| GET | `/api/scholarships/:id` | Get scholarship by ID |
| PUT | `/api/scholarships/:id` | Update scholarship |
| DELETE | `/api/scholarships/:id` | Delete scholarship |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/students/pdf` | Export students as PDF |
| GET | `/api/export/students/xlsx` | Export students as Excel |
| GET | `/api/export/students/csv` | Export students as CSV |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |

---

## Default Credentials

After running `npm run db:seed`, use these credentials:

| Role | Username | Password |
|------|----------|----------|
| ADMIN | `admin` | `admin123` |

⚠️ **Security Note**: Change default passwords immediately in production.

---

## Deployment

### Vercel Deployment

The project is configured for Vercel deployment via `vercel.json`:

```json
{
  "buildCommand": "npx prisma generate && npm run build"
}
```

**Environment variables must be set in Vercel dashboard:**
- `DATABASE_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema definition |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/lib/auth.ts` | Authentication utilities |
| `src/app/layout.tsx` | Root layout with providers |
| `src/components/ui/` | shadcn/ui component library |
| `docs/ERD.svg` | Database entity relationship diagram |
| `SYSTEM-MANUAL.md` | Complete user guide |
| `AGENTS.md` | Development guidelines for AI agents |

---

## Common Tasks

### Add a New Database Field

1. Update `prisma/schema.prisma`
2. Run `npm run db:push`
3. Regenerate Prisma client: `npx prisma generate`
4. Update TypeScript types if needed
5. Update forms and API routes

### Add a New Page

1. Create folder in `src/app/(dashboard)/`
2. Add `page.tsx` with React component
3. Add navigation link in layout
4. Create API routes if needed

### Add Export Functionality

1. Use `jspdf` for PDF exports
2. Use `xlsx` for Excel/CSV exports
3. Add API route in `src/app/api/export/`
4. Set proper headers for file download

---

## Troubleshooting

### Database Connection Issues

```bash
# Verify DATABASE_URL in .env
# Check PostgreSQL is running
# Run: npm run db:push
```

### Prisma Client Errors

```bash
# Regenerate Prisma client
npx prisma generate
```

### Build Failures

```bash
# Clean and reinstall
npm run clean
```

### Session/Auth Issues

1. Clear browser cookies
2. Verify JWT_SECRET in .env
3. Check session expiration settings

---

## Additional Resources

- [System Manual](./SYSTEM-MANUAL.md) - Complete user guide
- [Database Documentation](./docs/README.md) - ERD and schema details
- [Development Guide](./AGENTS.md) - Coding conventions and patterns
- [Prisma Docs](https://pris.ly/d/prisma-schema)
- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
