# ScholarTrack - Scholarship Tracking System

## Project Overview

ScholarTrack is a comprehensive web-based scholarship management system built with **Next.js 16** and **PostgreSQL**. It provides administrative tools for managing student records, scholarship programs, fee tracking, disbursements, academic years, and generating detailed reports with advanced role-based access control.

### Tech Stack

| Category             | Technology                                |
| -------------------- | ----------------------------------------- |
| **Framework**        | Next.js 16 (App Router)                   |
| **Language**         | TypeScript                                |
| **Database**         | PostgreSQL (via Prisma ORM v7)            |
| **Authentication**   | JWT + HTTP-only cookies (jose + bcryptjs) |
| **UI Library**       | React 19 + shadcn/ui + Radix UI           |
| **Styling**          | Tailwind CSS v4                           |
| **State Management** | TanStack Query (React Query v5)           |
| **Charts**           | Recharts                                  |
| **Testing**          | Vitest                                    |
| **Deployment**       | Vercel                                    |
| **Animation**        | GSAP, Motion, OGL                         |

### Core Features

- **User Management**: Role-based access control (ADMIN, STAFF, VIEWER) with account lockout protection
- **Student Management**: CRUD operations for student records with grade level tracking, graduation status, and archiving
- **Scholarship Management**: Multiple scholarship types (PAED, CHED, LGU, SCHOOL_GRANT) with flexible grant types and fee coverage options
- **Academic Year Management**: Track multiple academic years with semester support
- **Fee Tracking**: Detailed breakdown of tuition, miscellaneous, laboratory, and other fees with subsidy calculations
- **Disbursement Tracking**: Monitor scholarship payments and distributions linked to academic years
- **Graduation Management**: Track student graduation status and archive graduated students
- **Reports & Analytics**: Dashboard with statistics, charts, and exportable reports
- **Data Export**: PDF, Excel (XLSX), and CSV export capabilities
- **Audit Logging**: Complete activity tracking for accountability
- **Performance Optimization**: Database indexing, connection pooling, query optimization, and caching

## Project Structure

```
scholarship-tracking-system/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Authenticated dashboard pages
│   │   │   ├── students/       # Student management
│   │   │   ├── scholarships/   # Scholarship management
│   │   │   ├── reports/        # Reports and analytics
│   │   │   └── settings/       # User management settings (Admin only)
│   │   ├── api/                # API routes (REST)
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── students/       # Student CRUD
│   │   │   ├── scholarships/   # Scholarship CRUD
│   │   │   ├── dashboard/      # Dashboard data
│   │   │   ├── export/         # Export endpoints
│   │   │   ├── users/          # User management
│   │   │   ├── academic-years/ # Academic year management
│   │   │   ├── audit-logs/     # Audit log endpoints
│   │   │   ├── graduation/     # Graduation management
│   │   │   ├── profile/        # User profile
│   │   │   └── scheduler/      # Scheduled tasks
│   │   ├── login/              # Login page
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── dashboard/          # Dashboard components
│   │   ├── charts/             # Chart components
│   │   ├── forms/              # Form components
│   │   ├── layout/             # Layout components
│   │   ├── auth/               # Auth-related components
│   │   ├── providers/          # React providers
│   │   └── shared/             # Shared components
│   ├── lib/
│   │   ├── auth.ts             # Authentication utilities
│   │   ├── prisma.ts           # Prisma client singleton with performance monitoring
│   │   ├── utils.ts            # General utilities
│   │   ├── validations.ts      # Zod schemas
│   │   ├── cache.ts            # Data caching utilities
│   │   ├── backup-service.ts   # Backup utilities
│   │   ├── academic-year-service.ts  # Academic year logic
│   │   ├── graduation-service.ts     # Graduation logic
│   │   ├── scholarship-validation.ts # Scholarship validation
│   │   ├── validation-service.ts     # General validation service
│   │   ├── query-optimizer.ts  # Query optimization
│   │   ├── scheduler.ts        # Task scheduling
│   │   ├── cron.ts             # Cron job management
│   │   ├── constants.ts        # Application constants
│   │   └── seed-users.ts       # User seeding utilities
│   ├── hooks/
│   │   ├── use-queries.ts      # TanStack Query hooks
│   │   ├── use-api.ts          # API interaction hooks
│   │   └── use-debounce.ts     # Debounce hook
│   └── types/                  # TypeScript type definitions
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── schema-with-erd.prisma  # Schema with ERD annotations
│   ├── seed.ts                 # Database seeding
│   ├── prisma.config.ts        # Prisma configuration
│   └── migrations/             # Database migrations
├── docs/                       # Documentation
│   ├── ERD.svg                 # Entity Relationship Diagram
│   ├── index.html              # Interactive ERD viewer
│   ├── PERFORMANCE-OPTIMIZATION.md  # Performance guide
│   ├── RBAC-GUIDE.md           # Role-based access control guide
│   └── TANSTACK-QUERY-GUIDE.md # TanStack Query guide
├── changelog/                  # Change documentation
├── scripts/                    # Utility scripts
│   ├── add-indexes.ts          # Database index creation
│   └── test-scholarship-api.ts # API testing
└── tests/                      # Test files
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
DATABASE_URL="prisma+postgres://user:password@host:port/db?connection_limit=10&pool_timeout=20&connect_timeout=10"
JWT_SECRET="your-secure-secret-key-min-32-characters"
SESSION_SECRET="your-session-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
SESSION_DURATION_HOURS=8
```

**Note**: The DATABASE_URL now includes connection pool parameters for Prisma Accelerate:

- `connection_limit=10`: Maximum concurrent connections
- `pool_timeout=20`: Time to wait for connection from pool (in seconds)
- `connect_timeout=10`: Time to fail connection attempt (in seconds)

### Database Setup

```bash
# Generate Prisma client and push schema
npx prisma db push

# Apply database indexes for performance optimization
npm run db:add-indexes

# Seed the database with initial data
npm run db:seed

# (Optional) Open Prisma Studio for visual database management
npm run db:studio
```

### Development Server

```bash
# Start development server on port 8080 with webpack
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

| Command                  | Description                                   |
| ------------------------ | --------------------------------------------- |
| `npm run dev`            | Start development server (port 8080, webpack) |
| `npm run build`          | Generate Prisma client + production build     |
| `npm start`              | Start production server                       |
| `npm run lint`           | Run ESLint                                    |
| `npm run typecheck`      | TypeScript type checking                      |
| `npm run test`           | Run Vitest tests                              |
| `npm run test:watch`     | Run tests in watch mode                       |
| `npm run test:api`       | Test scholarship API endpoints                |
| `npm run db:push`        | Push Prisma schema to database                |
| `npm run db:seed`        | Seed database with initial data               |
| `npm run db:studio`      | Open Prisma Studio                            |
| `npm run db:add-indexes` | Apply performance indexes                     |
| `npm run erd:generate`   | Generate ERD visualization                    |
| `npm run erd:view`       | Open ERD in browser                           |
| `npm run clean`          | Clean node_modules and .next, reinstall       |

## Default Credentials

After seeding the database:

| Username | Password   | Role  | Email                  |
| -------- | ---------- | ----- | ---------------------- |
| `admin`  | `admin123` | ADMIN | admin@scholartrack.com |
| `user`   | `user123`  | STAFF | user@scholartrack.com  |

⚠️ **Security Note**: Change default credentials immediately in production.

## Database Schema

### Core Tables

1. **User** - Authentication and user management with RBAC
2. **Session** - User login sessions (JWT-based)
3. **AuditLog** - System activity tracking
4. **Student** - Student information with graduation tracking and archiving
5. **Scholarship** - Scholarship program definitions with flexible grant types
6. **StudentScholarship** - Junction table for student-scholarship assignments
7. **Disbursement** - Payment/disbursement tracking linked to academic years
8. **StudentFees** - Fee breakdown and subsidy calculations
9. **Backup** - Data backup records
10. **AcademicYear** - Academic year and semester management

### Key Relationships

- **User** → **Session** (One-to-Many)
- **User** → **AuditLog** (One-to-Many)
- **User** → **Backup** (One-to-Many)
- **Student** ↔ **Scholarship** (Many-to-Many via StudentScholarship)
- **Student** → **Disbursement** (One-to-Many)
- **Student** → **StudentFees** (One-to-Many)
- **Scholarship** → **Disbursement** (One-to-Many)
- **AcademicYear** → **StudentFees** (One-to-Many)
- **AcademicYear** → **Disbursement** (One-to-Many)

### New Schema Features

#### Student Model Enhancements

- `graduatedAt`: DateTime field for graduation date
- `graduationStatus`: Track student graduation status (Active, Graduated, Withdrew)
- `isArchived`: Boolean flag for archiving graduated students
- `termType`: Term type (SEMESTER, TRIMESTER, QUARTER)

#### Scholarship Model Enhancements

- `eligiblePrograms`: Filter scholarships by eligible programs
- `grantType`: Type of grant (FULL, TUITION_ONLY, MISC_ONLY, LAB_ONLY, NONE)
- `coversTuition/coversMiscellaneous/coversLaboratory/coversOther`: Fee coverage flags
- `tuitionFee/miscellaneousFee/laboratoryFee/otherFee`: Specific fee amounts
- `amountSubsidy/percentSubsidy`: Subsidy calculations

#### AcademicYear Model (New)

- `year`: Academic year identifier (e.g., "2025-2026")
- `semester`: Semester (1ST, 2ND, SUMMER)
- `startDate/endDate`: Academic year date range
- `isActive`: Flag for currently active academic year

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
- Debounced search inputs to prevent excessive API calls

### API Conventions

- RESTful endpoints under `/api/*`
- JWT authentication via HTTP-only cookies
- Zod validation for request bodies
- Consistent response format: `{ success: boolean, data?: T, error?: string }`
- Role-based access control on all protected endpoints
- Database-level aggregation for performance (use `groupBy` instead of JavaScript aggregation)

### Performance Best Practices

- Use database indexes for common query patterns
- Implement connection pooling for Prisma Accelerate
- Use `groupBy` for aggregations instead of fetching all records
- Debounce search inputs (300ms recommended)
- Combine related API calls when possible
- Monitor slow queries in production (>500ms)
- Use TanStack Query for automatic caching and background refetching

### Testing Practices

- Unit tests with **Vitest**
- Test files alongside source: `*.test.ts`
- Test API endpoints with `npm run test:api`

## Key Architecture Decisions

1. **Authentication**: JWT stored in HTTP-only cookies (no NextAuth)
2. **Data Fetching**: TanStack Query for client-side caching and synchronization
3. **Database**: Prisma ORM v7 with PostgreSQL
4. **UI Components**: shadcn/ui (copy-paste, not npm dependency)
5. **Styling**: Tailwind CSS v4 with custom design tokens
6. **Performance**: Connection pooling, database indexing, query optimization
7. **State Management**: Centralized TanStack Query hooks with automatic invalidation
8. **Role-Based Access Control**: Three-tier system (ADMIN, STAFF, VIEWER)
9. **Academic Year Support**: Multi-year tracking with semester management
10. **Graduation Tracking**: Automated status updates and archiving

## Common Tasks

### Add a New API Endpoint

1. Create route handler in `src/app/api/[resource]/route.ts`
2. Add authentication middleware if needed
3. Define Zod schema in `src/lib/validations.ts`
4. Add corresponding TanStack Query hook in `src/hooks/use-queries.ts`
5. Implement RBAC checks (ADMIN-only endpoints)

### Add a New Page

1. Create folder in `src/app/(dashboard)/[page-name]/`
2. Add `page.tsx` with React component
3. Add navigation link in layout sidebar
4. Create API endpoints if needed
5. Implement role-based UI visibility

### Database Migration

```bash
# Edit prisma/schema.prisma
# Then push changes (development)
npx prisma db push

# Or create migration (production)
npx prisma migrate dev --name [migration_name]
```

### Optimize Database Performance

```bash
# Apply performance indexes
npm run db:add-indexes

# Update query planner statistics (PostgreSQL)
# Run in database client:
ANALYZE students;
ANALYZE student_scholarships;
ANALYZE scholarships;
```

### View Database

```bash
# Open Prisma Studio
npm run db:studio

# View ERD
npm run erd:view
```

## Role-Based Access Control (RBAC)

### User Roles

1. **ADMIN**: Full access to all features, can manage users
2. **STAFF**: Read-only access to students and scholarships
3. **VIEWER**: Read-only access for stakeholders

### Admin-Only Features

- Settings page (`/settings`)
- User management (create, edit, delete, change roles)
- Student CRUD operations
- Scholarship CRUD operations
- Graduation management

### Access Control Implementation

- **Backend**: Role validation in API endpoints
- **Frontend**: Conditional rendering based on user role
- **Navigation**: Settings menu item only visible to admins
- **Audit Logging**: All actions logged with user context

For detailed RBAC guide, see `docs/RBAC-GUIDE.md`

## Performance Optimization

### Optimizations Applied

1. **Connection Pooling**: Configured via DATABASE_URL parameters
2. **Database Indexes**: Composite indexes for common query patterns
3. **Query Optimization**: Database-level aggregation with `groupBy`
4. **Slow Query Detection**: Automatic logging in production
5. **Debounced Search**: Reduces API calls during typing
6. **Combined Endpoints**: Single request for multiple related data
7. **TanStack Query**: Automatic caching and background refetching

### Performance Metrics

| Metric                | Before | After | Improvement |
| --------------------- | ------ | ----- | ----------- |
| Filter options API    | 17.1s  | ~0.3s | 57x faster  |
| Initial page load     | 17.2s  | ~2s   | 8.6x faster |
| Memory usage (filter) | O(n)   | O(1)  | Constant    |

For detailed performance guide, see `docs/PERFORMANCE-OPTIMIZATION.md`

## TanStack Query Implementation

### Query Hooks

All data fetching is centralized in `src/hooks/use-queries.ts`:

- `useDashboardStats()` - Dashboard statistics
- `useStudents(params)` - Student listing with filters
- `useStudent(id)` - Single student details
- `useCreateStudent()` - Create student mutation
- `useUpdateStudent()` - Update student mutation
- `useDeleteStudent()` - Delete student mutation
- Similar hooks for scholarships, users, etc.

### Query Keys

Centralized query keys for easy invalidation:

```typescript
queryKeys.students.lists();
queryKeys.students.detail(id);
queryKeys.scholarships.list({ type: 'CHED' });
queryKeys.dashboard.stats();
```

### Automatic Cache Invalidation

Mutations automatically invalidate related queries:

```typescript
const createStudent = useCreateStudent();
createStudent.mutate(data); // Automatically invalidates student queries
```

For detailed TanStack Query guide, see `docs/TANSTACK-QUERY-GUIDE.md`

## Troubleshooting

### Common Issues

| Issue                       | Solution                                                          |
| --------------------------- | ----------------------------------------------------------------- |
| Port 8080 in use            | Change port in `package.json` dev script                          |
| Prisma client not generated | Run `npx prisma generate`                                         |
| Database connection error   | Verify `DATABASE_URL` in `.env`, check connection pool parameters |
| Auth not working            | Clear cookies, ensure JWT_SECRET matches                          |
| Build fails                 | Run `npm run typecheck` to identify TS errors                     |
| Slow queries                | Run `npm run db:add-indexes` to apply performance indexes         |
| Prisma retry warnings       | Check DATABASE_URL parameters, reduce `connection_limit`          |

### Performance Issues

**Queries still slow after indexing?**

1. Run `ANALYZE` to update database statistics
2. Check if index is being used: `EXPLAIN ANALYZE <query>`
3. Verify index covers all filter columns
4. Monitor slow query logs in console

**Connection pool exhaustion?**

1. Reduce `connection_limit` in DATABASE_URL
2. Check Prisma Accelerate dashboard
3. Verify network connectivity to database

**Memory issues?**

1. Reduce cache TTL in `query-optimizer.ts`
2. Decrease `maxEntries` in QueryOptimizer
3. Monitor with `queryOptimizer.getStats()`

## Documentation

- **System Manual**: `SYSTEM-MANUAL.md` - Complete user guide
- **API Documentation**: Available in `src/app/api/*/route.ts` files
- **Database ERD**: `docs/ERD.svg` and `docs/index.html`
- **RBAC Guide**: `docs/RBAC-GUIDE.md` - Role-based access control
- **Performance Guide**: `docs/PERFORMANCE-OPTIMIZATION.md` - Performance optimization
- **TanStack Query Guide**: `docs/TANSTACK-QUERY-GUIDE.md` - Data fetching patterns
- **Change Logs**: `changelog/` - Feature history and migrations

## Deployment (Vercel)

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy (automatic on push to main branch)

### Environment Variables for Production

```env
DATABASE_URL=<production-postgresql-url-with-pool-params>
JWT_SECRET=<secure-random-32-char-string>
SESSION_SECRET=<secure-random-string>
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<secure-random-string>
```

### Production Checklist

- [ ] Change default admin password
- [ ] Configure connection pooling for production database
- [ ] Apply database indexes (`npm run db:add-indexes`)
- [ ] Set appropriate `connection_limit` based on plan
- [ ] Enable error tracking and monitoring
- [ ] Review and update RBAC settings
- [ ] Configure CORS if needed
- [ ] Set up backup strategy
- [ ] Test all user roles and permissions
- [ ] Verify export functionality

## Security Best Practices

1. **Never commit secrets**: Ensure `.env` is in `.gitignore`
2. **Use environment variables**: All secrets must be in environment variables
3. **Change default credentials**: Update admin password immediately
4. **Implement rate limiting**: Protect against brute force attacks
5. **Regular audits**: Review audit logs for suspicious activity
6. **Keep dependencies updated**: Regular security updates
7. **Use HTTPS**: Required for production deployments
8. **Validate all inputs**: Use Zod schemas for validation
9. **Principle of least privilege**: Assign minimum required role
10. **Session management**: 8-hour session timeout with refresh

## Contributing

When contributing to this project:

1. Follow existing code conventions and patterns
2. Use TypeScript strictly with proper typing
3. Write tests for new features
4. Update documentation for new features
5. Run type checking: `npm run typecheck`
6. Run tests: `npm run test`
7. Check for performance implications
8. Ensure RBAC is properly implemented
9. Add database indexes for new queries
10. Update changelog with changes

## License

See LICENSE file for details.
