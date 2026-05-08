# ScholarTrack - Scholarship Tracking System

<div align="center">
  <img src="src/assets/images/logo.png" alt="ScholarTrack Logo" width="200">
</div>

A comprehensive web-based scholarship management system built with **Next.js 16** and **PostgreSQL**. ScholarTrack provides administrative tools for managing student records, scholarship programs, fee tracking, disbursements, academic years, and generating detailed reports with advanced role-based access control.

## Features

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

## Screenshots

### Dashboard

<div align="center">
  <img src="src/screenshots/dashboard.png" alt="Dashboard">
</div>

### Student Management

<div align="center">
  <img src="src/screenshots/students.png" alt="Student Management">
</div>

### Scholarship Management

<div align="center">
  <img src="src/screenshots/scholarships.png" alt="Scholarship Management">
</div>

### Reports & Analytics

<div align="center">
  <img src="src/screenshots/reports.png" alt="Reports & Analytics">
</div>

## Tech Stack

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

## Installation

### Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher (or use the configured Prisma Accelerate URL)
- **npm** or **yarn**

### Steps

1. Clone the repository:

```bash
git clone https://github.com/your-repo/scholarship-tracking-system.git
cd scholarship-tracking-system
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with the following variables:

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

4. Set up the database:

```bash
# Generate Prisma client and push schema
npx prisma db push

# Apply database indexes for performance optimization
npm run db:add-indexes

# Seed the database with initial data
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

Access the application at: `http://localhost:8080`

## Default Credentials

After seeding the database:

| Username | Password   | Role  | Email                  |
| -------- | ---------- | ----- | ---------------------- |
| `admin`  | `admin123` | ADMIN | admin@scholartrack.com |
| `user`   | `user123`  | STAFF | user@scholartrack.com  |

## Deployment

### Vercel

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

## Support

For issues, questions, or feature requests, please open an issue on the GitHub repository.

---

© 2024 ScholarTrack. All rights reserved.
