# ScholarTrack - Scholarship Tracking System

## Project Overview

ScholarTrack is a comprehensive web-based scholarship management system built with **Next.js 16** and **PostgreSQL**. It provides administrative tools for managing student records, scholarship programs, fee tracking, disbursements, and generating detailed reports.

### Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Authentication** | JWT + HTTP-only cookies (jose + bcryptjs) |
| **UI Library** | React 19 + shadcn/ui + Radix UI |
| **Styling** | Tailwind CSS v4 |
| **State Management** | TanStack Query (React Query) |
| **Charts** | Recharts |
| **Testing** | Vitest |
| **Deployment** | Vercel |

### Core Features

- **User Management**: Role-based access control (ADMIN, STAFF, VIEWER) with account lockout protection
- **Student Management**: CRUD operations for student records with grade level tracking
- **Scholarship Management**: Multiple scholarship types (PAED, CHED, LGU, SCHOOL_GRANT)
- **Fee Tracking**: Detailed breakdown of tuition, miscellaneous, laboratory, and other fees
- **Disbursement Tracking**: Monitor scholarship payments and distributions
- **Reports & Analytics**: Dashboard with statistics, charts, and exportable reports
- **Data Export**: PDF, Excel (XLSX), and CSV export capabilities
- **Audit Logging**: Complete activity tracking for accountability

## Project Structure

```
scholarship-tracking-system/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Authenticated dashboard pages
│   │   │   ├── students/       # Student management
│   │   │   ├── scholarships/   # Scholarship management
│   │   │   ├── reports/        # Reports and analytics
│   │   │   └── settings/       # User management settings
│   │   ├── api/                # API routes (REST)
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── students/       # Student CRUD
│   │   │   ├── scholarships/   # Scholarship CRUD
│   │   │   ├── dashboard/      # Dashboard data
│   │   │   ├── export/         # Export endpoints
│   │   │   └── users/          # User management
│   │   ├── login/              # Login page
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── dashboard/          # Dashboard components
│   │   ├── charts/             # Chart components
│   │   ├── forms/              # Form components
│   │   ├── layout/             # Layout components
│   │   └── auth/               # Auth-related components
│   ├── lib/
│   │   ├── auth.ts             # Authentication utilities
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── utils.ts            # General utilities
│   │   ├── validations.ts      # Zod schemas
│   │   ├── cache.ts            # Data caching utilities
│   │   └── backup-service.ts   # Backup utilities
│   ├── hooks/
│   │   ├── use-queries.ts      # TanStack Query hooks
│   │   ├── use-api.ts          # API interaction hooks
│   │   └── use-debounce.ts     # Debounce hook
│   └── types/                  # TypeScript type definitions
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Database seeding
├── docs/                       # Documentation
│   ├── ERD.svg                 # Entity Relationship Diagram
│   └── index.html              # Interactive ERD viewer
└── scripts/                    # Utility scripts
```

## Building and Running

### Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher (or use the configured Prisma Accelerate URL)
- **npm** or **yarn**

### Installation

```bash
# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file with the following variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/scholarship_db"
JWT_SECRET="your-secure-secret-key-min-32-characters"
SESSION_SECRET="your-session-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
SESSION_DURATION_HOURS=8
```

### Database Setup

```bash
# Generate Prisma client and push schema
npx prisma db push

# Seed the database with initial data
npm run db:seed

# (Optional) Open Prisma Studio for visual database management
npm run db:studio
```

### Development Server

```bash
# Start development server on port 8080
npm run dev
```

Access at: `http://localhost:8080`

### Production Build

```bash
# Generate Prisma client and build
npm run build

# Start production server
npm start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 8080) |
| `npm run build` | Generate Prisma client + production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run erd:generate` | Generate ERD visualization |
| `npm run erd:view` | Open ERD in browser |

## Default Credentials

After seeding the database:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | ADMIN |

⚠️ **Security Note**: Change default credentials immediately in production.

## Database Schema

### Core Tables

1. **User** - Authentication and user management
2. **Session** - User login sessions (JWT-based)
3. **AuditLog** - System activity tracking
4. **Student** - Student information and records
5. **Scholarship** - Scholarship program definitions
6. **StudentScholarship** - Junction table for student-scholarship assignments
7. **Disbursement** - Payment/disbursement tracking
8. **StudentFees** - Fee breakdown and subsidy calculations
9. **Backup** - Data backup records

### Key Relationships

- **User** → **Session** (One-to-Many)
- **User** → **AuditLog** (One-to-Many)
- **Student** ↔ **Scholarship** (Many-to-Many via StudentScholarship)
- **Student** → **Disbursement** (One-to-Many)
- **Student** → **StudentFees** (One-to-Many)
- **Scholarship** → **Disbursement** (One-to-Many)

## Development Conventions

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Consistent with existing codebase patterns
- **Naming**: 
  - Components: PascalCase
  - Files: kebab-case for routes, PascalCase for components
  - Functions/variables: camelCase
  - Constants: UPPER_SNAKE_CASE

### Component Patterns

- Use **shadcn/ui** primitives for consistent UI
- Server Components by default; `'use client'` only when needed
- TanStack Query for data fetching (see `src/hooks/use-queries.ts`)
- Proper loading states with skeleton components

### API Conventions

- RESTful endpoints under `/api/*`
- JWT authentication via HTTP-only cookies
- Zod validation for request bodies
- Consistent response format: `{ success: boolean, data?: T, error?: string }`

### Testing Practices

- Unit tests with **Vitest**
- Test files alongside source: `*.test.ts`
- Test API endpoints with `npm run test:api`

## Key Architecture Decisions

1. **Authentication**: JWT stored in HTTP-only cookies (no NextAuth)
2. **Data Fetching**: TanStack Query for client-side caching and synchronization
3. **Database**: Prisma ORM with PostgreSQL
4. **UI Components**: shadcn/ui (copy-paste, not npm dependency)
5. **Styling**: Tailwind CSS v4 with custom design tokens

## Common Tasks

### Add a New API Endpoint

1. Create route handler in `src/app/api/[resource]/route.ts`
2. Add authentication middleware if needed
3. Define Zod schema in `src/lib/validations.ts`
4. Add corresponding TanStack Query hook in `src/hooks/use-queries.ts`

### Add a New Page

1. Create folder in `src/app/(dashboard)/[page-name]/`
2. Add `page.tsx` with React component
3. Add navigation link in layout sidebar
4. Create API endpoints if needed

### Database Migration

```bash
# Edit prisma/schema.prisma
# Then push changes (development)
npx prisma db push

# Or create migration (production)
npx prisma migrate dev --name [migration_name]
```

### View Database

```bash
# Open Prisma Studio
npm run db:studio

# View ERD
npm run erd:view
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 8080 in use | Change port in `package.json` dev script |
| Prisma client not generated | Run `npx prisma generate` |
| Database connection error | Verify `DATABASE_URL` in `.env` |
| Auth not working | Clear cookies, ensure JWT_SECRET matches |
| Build fails | Run `npm run typecheck` to identify TS errors |

## Documentation

- **System Manual**: `SYSTEM-MANUAL.md` - Complete user guide
- **API Documentation**: Available in `src/app/api/*/route.ts` files
- **Database ERD**: `docs/ERD.svg` and `docs/index.html`
- **RBAC Guide**: `docs/RBAC-GUIDE.md`
- **TanStack Query Guide**: `docs/TANSTACK-QUERY-GUIDE.md`

## Deployment (Vercel)

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy (automatic on push to main branch)

### Environment Variables for Production

```env
DATABASE_URL=<production-postgresql-url>
JWT_SECRET=<secure-random-32-char-string>
SESSION_SECRET=<secure-random-string>
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<secure-random-string>
```
