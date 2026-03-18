# ScholarTrack - System Architecture Diagram

## High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Browser Client                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   React 19   │  │  TanStack    │  │   Recharts   │               │   │
│  │  │  Components  │  │    Query     │  │    Charts    │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  shadcn/ui   │  │  React Hook  │  │   Lucide     │               │   │
│  │  │  Components  │  │    Form      │  │   Icons      │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/HTTPS
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS 16 APPLICATION                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         App Router Layer                            │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │  /students  │ │/scholarships│ │   /reports  │ │  /settings  │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │    /login   │ │   /api/*    │ │  /dashboard │ │   /export   │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                     │
│  ┌───────────────────────────────────┴─────────────────────────────────┐   │
│  │                        API Routes (REST)                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │ 
│  │  │  /auth   │ │/students │ │/scholars │ │ /reports │ │  /users  │   │   │
│  │  │  /api    │ │  /api    │ │  /api    │ │  /api    │ │  /api    │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                     │
│  ┌───────────────────────────────────┴──────────────────────────────────┐  │
│  │                       Middleware & Auth Layer                        │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                    │  │
│  │  │   JWT Validation    │  │   Role-Based Access │                    │  │
│  │  │   (jose library)    │  │   (ADMIN/STAFF/     │                    │  │
│  │  │   HTTP-only cookies │  │    VIEWER)          │                    │  │
│  │  └─────────────────────┘  └─────────────────────┘                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                     │
│  ┌───────────────────────────────────┴───────────────────────────────────┐ │
│  │                      Service/Business Logic Layer                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │ │
│  │  │   Auth       │  │   Student    │  │  Scholarship │                 │ │
│  │  │   Service    │  │   Service    │  │   Service    │                 │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │ │
│  │  │ Disbursement │  │    Report    │  │    Export    │                 │ │
│  │  │   Service    │  │   Service    │  │   Service    │                 │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                     │
│  ┌───────────────────────────────────┴───────────────────────────────────┐ │
│  │                         Data Access Layer                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    Prisma ORM (v6)                              │  │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │ │
│  │  │  │  Student │  │Scholarship│ │Disburse  │ │  User   │           │  │ │
│  │  │  │  Model   │  │  Model   │  │  Model   │ │  Model  │           │  │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ PostgreSQL Protocol
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      PostgreSQL Database                            │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │    │
│  │  │   users    │  │  students  │  │scholarships│  │disbursements│    │    │
│  │  │   table    │  │   table    │  │   table    │  │   table    │     │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │    │
│  │  │  sessions  │  │audit_logs  │  │ backups    │  │academic_   │     │    │
│  │  │   table    │  │   table    │  │   table    │  │  years     │     │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │    │
│  │  ┌────────────────────┐  ┌────────────────────┐                     │    │
│  │  │student_scholarships│  │   student_fees     │                     │    │
│  │  │   (junction)       │  │     table          │                     │    │
│  │  └────────────────────┘  └────────────────────┘                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────┐                             ┌──────────┐
│  Client  │                             │  Server  │
└────┬─────┘                             └────┬─────┘
     │                                        │
     │  1. POST /api/auth/login               │
     │     {username, password}               │
     ├───────────────────────────────────────>│
     │                                        │
     │                                        │ 2. Validate credentials
     │                                        │    (bcryptjs)
     │                                        │
     │                                        │ 3. Generate JWT
     │                                        │    (jose)
     │                                        │
     │  4. Response with HTTP-only cookie     │
     │     Set-Cookie: session=<jwt>          │
     │<───────────────────────────────────────┤
     │                                        │
     │                                        │
     │  5. Subsequent requests                │
     │     Cookie: session=<jwt>              │
     ├───────────────────────────────────────>│
     │                                        │
     │                                        │ 6. Verify JWT
     │                                        │    Check expiration
     │                                        │    Validate signature
     │                                        │
     │                                        │ 7. Check RBAC permissions
     │                                        │
     │  8. Protected resource                 │
     │<───────────────────────────────────────┤
     │                                        │
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REQUEST FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  User   │
    └────┬────┘
         │
         ▼
    ┌─────────────────┐
    │  Browser Event  │ (click, submit, etc.)
    └────┬────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  React Component        │
    │  (src/components/)      │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  TanStack Query Hook    │
    │  (src/hooks/)           │
    │  - useStudents()        │
    │  - useScholarships()    │
    │  - useDashboard()       │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  API Call (fetch)       │
    │  /api/[resource]        │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  Route Handler          │
    │  (src/app/api/)         │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  Auth Middleware        │
    │  - JWT validation       │
    │  - Role check           │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  Business Logic         │
    │  - Validation (Zod)     │
    │  - Processing           │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  Prisma ORM             │
    │  - Query building       │
    │  - Type safety          │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  PostgreSQL             │
    │  - Data retrieval       │
    │  - Transactions         │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  Response JSON          │
    │  {success, data, error} │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  TanStack Query Cache   │
    │  - Invalidate/Refetch   │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │  UI Update              │
    │  - Re-render            │
    │  - Toast notification   │
    └─────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT HIERARCHY                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Root Layout (src/app/layout.tsx)                                       │
│  - Providers (QueryClient, Theme)                                       │
│  - Global styles                                                        │
└─────────────────────────────────────────────────────────────────────────┘
    │
    ├───┬─────────────────────────────────────────────────────┐
    │   │                                                     │
    │   ▼                                                     ▼
    │   ┌─────────────────┐                           ┌───────────────┐
    │   │  Login Page     │                           │ Dashboard     │
    │   │  /login         │                           │ Layout        │
    │   │                 │                           │ (dashboard)/  │
    │   └─────────────────┘                           └───────┬───────┘
    │                                                         │
    │         ┌───────────────────────────────────────────────┼──────────┐
    │         │                       │                       │          │
    │         ▼                       ▼                       ▼          ▼
    │   ┌───────────┐         ┌─────────────┐         ┌───────────┐ ┌───────────┐
    │   │ /students │         │/scholarships│         │ /reports  │ │ /settings │
    │   │   Page    │         │   Page      │         │   Page    │ │   Page    │
    │   └─────┬─────┘         └─────┬───────┘         └─────┬─────┘ └─────┬─────┘
    │         │                     │                       │             │
    │         ▼                     ▼                       ▼             ▼
    │   ┌───────────┐         ┌───────────┐           ┌───────────┐ ┌───────────┐
    │   │ Student   │         │Scholarship│           │  Report   │ │   User    │
    │   │  Table    │         │  Table    │           │ Components│ │  Forms    │
    │   └─────┬─────┘         └─────┬─────┘           └───────────┘ └───────────┘
    │         │                     │
    │         ▼                     ▼
    │   ┌───────────┐         ┌───────────┐
    │   │ Student   │         │Scholarship│
    │   │   Form    │         │   Form    │
    │   │  (Dialog) │         │  (Dialog) │
    │   └───────────┘         └───────────┘
    │
    └─────────────────────────────────────────────────────────────────────
    
    Shared Components (src/components/):
    ├── ui/           (shadcn primitives: Button, Input, Dialog, etc.)
    ├── layout/       (Sidebar, Header, Navbar)
    ├── forms/        (Reusable form components)
    ├── charts/       (Recharts wrappers)
    └── dashboard/    (Dashboard-specific widgets)
```

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIP DIAGRAM                          │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │    User      │
    │──────────────│
    │ PK user_id   │
    │    username  │
    │    email     │
    │    role      │
    │    status    │
    └──────┬───────┘
           │
     ┌─────┴─────┬──────────────┐
     │           │              │
     │ 1:N       │ 1:N          │ 1:N
     ▼           ▼              ▼
┌─────────┐ ┌──────────┐  ┌──────────┐
│ Session │ │AuditLog  │  │  Backup  │
│─────────│ │──────────│  │──────────│
│PK id    │ │PK log_id │  │PK backup_│
│FK user_ │ │FK user_  │  │FK perfor-│
│expires_ │ │action    │  │  med_by  │
│created_ │ │resource_ │  │operation │
└─────────┘ │details   │  │old_value │
            └──────────┘  └──────────┘

    ┌──────────────┐
    │   Student    │
    │──────────────│
    │PK student_id │
    │  first_name  │
    │  last_name   │
    │  grade_level │
    │  program     │
    │  status      │
    └──────┬───────┘
           │
     ┌─────┴─────────────────────┐
     │ 1:N                       │ 1:N
     ▼                           ▼
┌──────────────┐         ┌────────────────────┐
│ Disbursement │         │StudentScholarship  │
│──────────────│         │────────────────────│
│PK disburse_  │         │PK student_scholar_ │
│FK student_id │         │FK student_id       │
│FK scholarship│         │FK scholarship_id   │
│amount        │         │award_date          │
│term          │         │grant_amount        │
│method        │         │scholarship_status  │
└──────────────┘         │grant_type          │
                         └─────────┬──────────┘
                                   │ N:1
                                   ▼
                         ┌─────────────────┐
                         │   Scholarship   │
                         │─────────────────│
                         │PK scholarship_id│
                         │scholarship_name │
                         │type             │
                         │amount           │
                         │sponsor          │
                         │grant_type       │
                         │covers_*         │
                         └─────────────────┘

    ┌──────────────┐
    │  StudentFees │
    │──────────────│
    │PK fees_id    │
    │FK student_id │
    │FK academic_  │
    │tuition_fee   │
    │misc_fee      │
    │lab_fee       │
    │amount_subsidy│
    │percent_subsid│
    │term          │
    │academic_year │
    └──────────────┘

    ┌──────────────┐
    │ AcademicYear │
    │──────────────│
    │PK academic_  │
    │year          │
    │start_date    │
    │end_date      │
    │semester      │
    │is_active     │
    └──────────────┘
```

## Technology Stack Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TECHNOLOGY STACK                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │  React 19   │ │  Next.js 16 │ │  Tailwind   │ │  shadcn/ui  │       │
│  │             │ │  App Router │ │  CSS v4     │ │  Radix UI   │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │  Recharts   │ │  Lucide/    │ │  Motion     │ │  jsPDF +    │       │
│  │             │ │  Tabler     │ │  (GSAP)     │ │  autoTable  │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│  STATE MANAGEMENT & DATA LAYER                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │  TanStack   │ │  React Hook │ │  Zod        │ │  class-     │       │
│  │  Query      │ │  Form       │ │  Validation │ │  variance   │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ │  authority  │       │
│                                                  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│  AUTHENTICATION & SECURITY LAYER                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                       │
│  │  jose       │ │  bcryptjs   │ │  HTTP-only  │                       │
│  │  (JWT)      │ │  (hashing)  │ │  cookies    │                       │
│  └─────────────┘ └─────────────┘ └─────────────┘                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│  DATA ACCESS LAYER                                                      │
│  ┌─────────────┐ ┌─────────────┐                                       │
│  │  Prisma     │ │  PostgreSQL │                                       │
│  │  ORM v6     │ │  Database   │                                       │
│  └─────────────┘ └─────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│  EXPORT & REPORTING                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                       │
│  │  XLSX       │ │  jsPDF      │ │  Recharts   │                       │
│  │  (Excel)    │ │  (PDF)      │ │  (Charts)   │                       │
│  └─────────────┘ └─────────────┘ └─────────────┘                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture (Vercel)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL DEPLOYMENT                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │   Git Push      │
                         │   (main branch) │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   Vercel        │
                         │   Build         │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
           ┌─────────────────┐         ┌─────────────────┐
           │  Edge Network   │         │  Serverless     │
           │  (Static Assets)│         │  Functions      │
           │                 │         │  (API Routes)   │
           │  - HTML         │         │                 │
           │  - CSS          │         │  - /api/*       │
           │  - JS           │         │  - Dynamic      │
           │  - Images       │         │    Rendering    │
           └────────┬────────┘         └────────┬────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  PostgreSQL     │
                         │  (External DB)  │
                         │  - Prisma       │
                         │  - Connection   │
                         │    Pooling      │
                         └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENVIRONMENT CONFIGURATION                            │
│                                                                              │
│  Variable              │ Required │ Description                             │
│  ──────────────────────┼──────────┼──────────────────────────────────────── │
│  DATABASE_URL          │    ✓     │ PostgreSQL connection string            │
│  JWT_SECRET            │    ✓     │ JWT signing key (32+ chars)             │
│  SESSION_SECRET        │    ✓     │ Session encryption key                  │
│  NEXTAUTH_URL          │    ✓     │ Application base URL                    │
│  NEXTAUTH_SECRET       │    ✓     │ NextAuth secret key                     │
│  MAX_LOGIN_ATTEMPTS    │    ✓     │ Max failed login attempts (default: 5)  │
│  LOCKOUT_DURATION_MIN  │    ✓     │ Account lockout duration (minutes)      │
│  SESSION_DURATION_HRS  │    ✓     │ Session expiration (hours)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │  LAYER 1: Authentication                                            │
    │  ┌───────────────────────────────────────────────────────────────┐ │
    │  │ • JWT tokens signed with jose library                         │ │
    │  │ • HTTP-only cookies (XSS protection)                          │ │
    │  │ • bcryptjs password hashing (cost factor: 10)                 │ │
    │  │ • Session expiration management                               │ │
    │  └───────────────────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │  LAYER 2: Authorization (RBAC)                                      │
    │  ┌───────────────────────────────────────────────────────────────┐ │
    │  │ • Role-based access control (ADMIN, STAFF, VIEWER)            │ │
    │  │ • Middleware-level route protection                           │ │
    │  │ • API endpoint permission checks                              │ │
    │  │ • Account lockout after failed attempts                       │ │
    │  └───────────────────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │  LAYER 3: Data Protection                                           │
    │  ┌───────────────────────────────────────────────────────────────┐ │
    │  │ • Zod schema validation (input sanitization)                  │ │
    │  │ • SQL injection prevention (Prisma parameterized queries)     │ │
    │  │ • Audit logging for all operations                            │ │
    │  │ • Backup tracking for data recovery                           │ │
    │  └───────────────────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │  LAYER 4: Infrastructure                                            │
    │  ┌───────────────────────────────────────────────────────────────┐ │
    │  │ • Vercel Edge Network (DDoS protection)                       │ │
    │  │ • HTTPS/TLS encryption                                        │ │
    │  │ • Environment variable isolation                              │ │
    │  │ • Rate limiting (via Vercel)                                  │ │
    │  └───────────────────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────────────────┘
```

## File Structure Overview

```
scholarship-tracking-system/
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # Authenticated routes
│   │   │   ├── students/
│   │   │   │   ├── page.tsx          # Student list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Student detail
│   │   │   ├── scholarships/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── api/                      # REST API endpoints
│   │   │   ├── auth/
│   │   │   ├── students/
│   │   │   ├── scholarships/
│   │   │   ├── export/
│   │   │   └── users/
│   │   ├── login/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn primitives
│   │   ├── dashboard/                # Dashboard widgets
│   │   ├── forms/                    # Form components
│   │   ├── layout/                   # Layout components
│   │   └── charts/                   # Chart components
│   │
│   ├── hooks/
│   │   ├── use-queries.ts            # TanStack Query hooks
│   │   ├── use-api.ts                # API utilities
│   │   └── use-debounce.ts
│   │
│   ├── lib/
│   │   ├── auth.ts                   # Auth utilities
│   │   ├── prisma.ts                 # Prisma client
│   │   ├── utils.ts                  # General utilities
│   │   ├── validations.ts            # Zod schemas
│   │   └── cache.ts                  # Caching utilities
│   │
│   └── types/                        # TypeScript types
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Seed data
│
├── docs/
│   ├── ERD.svg                       # Entity diagram
│   └── index.html                    # ERD viewer
│
├── scripts/                          # Utility scripts
│
├── .env                              # Environment variables
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
└── vercel.json                       # Vercel config
```

---

*Generated for ScholarTrack v0.1.0 - Scholarship Tracking System*
