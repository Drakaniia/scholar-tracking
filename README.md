<div align="center">

# ScholarTrack - Scholarship Tracking System

A comprehensive system to manage, monitor, and streamline all scholarship-related activities for students.

</div>

## Features

- Dashboard: Overview with statistics, recent applications, and upcoming deadlines
- Student Management: Full CRUD for student records with education levels
- Scholarship Management: Internal (Cash Assistance) and External (CHED, TESDA, TDP, LGU) scholarships
- Application Tracking: Assign scholarships to students with approval workflow
- Export: PDF and CSV exports for all data

## Tech Stack

<div align="center">

| Technology | Description | Icon |
|------------|-------------|------|
| **Next.js** | React framework with App Router | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" width="40" height="40"> |
| **PostgreSQL** | Relational database | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" width="40" height="40"> |
| **Prisma ORM** | Database toolkit | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prisma/prisma-original.svg" width="40" height="40"> |
| **Tailwind CSS** | Utility-first CSS framework | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" width="40" height="40"> |
| **shadcn/ui** | Accessible UI components | <img src="https://ui.shadcn.com/favicon.ico" width="40" height="40"> |
| **TypeScript** | Typed JavaScript | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="40" height="40"> |
| **React Hook Form** | Form state management | <img src="https://react-hook-form.com/favicon-32x32.png" width="40" height="40"> |

</div>

## Prerequisites

- Node.js 18+
- PostgreSQL database

## Setup Commands

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd scholarship-tracking-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   # Edit .env file with your database URL
   DATABASE_URL="postgresql://user:password@localhost:5432/scholarship_db"
   ```

4. **Setup database**:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

 5. **Run development server**:
    ```bash
    npm run dev
    ```

 6. **Open** [http://localhost:3000](http://localhost:3000)

 7. **View database tables** (optional):
    ```bash
    npx prisma studio
    ```
    This will open Prisma Studio in your browser where you can visually inspect and manage your database records.

## Prisma Database Schema

```prisma
// Prisma Schema for Scholarship Tracking System
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// STUDENT MODEL
// ============================================
model Student {
  id             Int      @id @default(autoincrement())
  firstName      String
  middleName     String?
  lastName       String
  yearLevel      String   // 1st Year, 2nd Year, 3rd Year, 4th Year, 5th Year
  course         String
  tuitionFee     Float
  educationLevel String   // Grade School, Junior High, Senior High, College
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  scholarships StudentScholarship[]

  @@map("students")
}

// ============================================
// SCHOLARSHIP MODEL
// ============================================
model Scholarship {
  id             Int      @id @default(autoincrement())
  name           String
  description    String?
  type           String   // Internal, External
  category       String?  // For External: CHED, TESDA, TDP, LGU, Other
  amount         Float
  eligibility    String?
  
  // Application Period
  applicationStart DateTime?
  applicationEnd   DateTime?
  isActive         Boolean   @default(true)

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  students StudentScholarship[]

  @@map("scholarships")
}

// ============================================
// STUDENT-SCHOLARSHIP JUNCTION TABLE
// ============================================
model StudentScholarship {
  id            Int      @id @default(autoincrement())
  studentId     Int
  scholarshipId Int
  
  status        String   @default("Pending") // Pending, Approved, Rejected, Expired
  dateApplied   DateTime @default(now())
  dateApproved  DateTime?
  remarks       String?

  // Relations
  student     Student     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  scholarship Scholarship @relation(fields: [scholarshipId], references: [id], onDelete: Cascade)

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([studentId, scholarshipId])
  @@map("student_scholarships")
}
```

## Architecture Diagram

```mermaid
graph TD
    A[Browser] --> B[Next.js App Router]
    B --> C[React Components]
    C --> D[shadcn/ui Components]
    
    B --> E[API Routes]
    E --> F[Prisma ORM]
    F --> G[PostgreSQL Database]
    
    G --> H[Student Table]
    G --> I[Scholarship Table]
    G --> J[StudentScholarship Table]
    
    B --> K[React Hooks]
    K --> L[State Management]
    
    D --> M[UI Components]
    M --> N[Tailwind CSS]
    
    style A fill:#4a90e2
    style B fill:#90c541
    style G fill:#f28c28
    style D fill:#c19a6b
    style N fill:#38b6ff
```

## Database Management

### Prisma Studio
To view and manage your database tables visually, run:
```bash
npx prisma studio
```
This opens a local web interface where you can inspect and modify your database records directly.

### Seeding Data
To populate your database with sample data:
```bash
npx prisma db seed
```

## Project Structure

 ```
 src/
 ├── app/                    # Next.js App Router
 │   ├── api/               # API Routes
 │   │   ├── students/      # Student CRUD
 │   │   ├── scholarships/  # Scholarship CRUD
 │   │   ├── applications/  # Application management
 │   │   ├── dashboard/     # Dashboard stats
 │   │   └── export/        # PDF/CSV exports
 │   ├── students/          # Students page
 │   ├── scholarships/      # Scholarships page
 │   ├── applications/      # Applications page
 │   └── page.tsx           # Dashboard
 ├── components/
 │   ├── ui/                # shadcn/ui components
 │   ├── layout/            # Layout components
 │   ├── forms/             # Form components
 │   └── shared/            # Shared/reusable components
 ├── hooks/                 # Custom React hooks
 ├── lib/                   # Utilities and configs
 └── types/                 # TypeScript types
 ```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
