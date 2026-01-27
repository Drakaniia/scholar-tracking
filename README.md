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

### Database ERD Visualization
View your database schema as an interactive Entity Relationship Diagram:

```bash
# View the ERD in your browser
npm run erd:view

# Regenerate ERD after schema changes
npm run erd:generate
```

The ERD viewer includes:
- 🔍 Zoom controls (In/Out/Reset)
- ⬇️ Download SVG option
- 📊 Interactive table relationships
- 🎨 Forest theme visualization

**Location**: `docs/index.html` and `docs/ERD.svg`

For more details, see [Database Documentation](./docs/README.md)

### Seeding Data
To populate your database with sample data:
```bash
npx prisma db seed
```

## System Flowchart

```mermaid
flowchart TD
    Start([Start: User Access System]) --> Login{Login Page}
    Login -->|Valid Credentials| Auth[Authenticate User]
    Login -->|Invalid| LoginError[Show Error Message]
    LoginError --> Login
    
    Auth --> Dashboard[Dashboard View]
    
    Dashboard --> Choice{Select Action}
    
    Choice -->|Manage Students| Students[Students Module]
    Choice -->|Manage Scholarships| Scholarships[Scholarships Module]
    Choice -->|View Reports| Reports[Reports Module]
    Choice -->|Logout| Logout[End Session]
    
    Students --> StudentAction{Student Action}
    StudentAction -->|Add| AddStudent[Create New Student]
    StudentAction -->|Edit| EditStudent[Update Student Info]
    StudentAction -->|Delete| DeleteStudent[Remove Student]
    StudentAction -->|View| ViewStudent[View Student Details]
    StudentAction -->|Assign Scholarship| AssignScholar[Assign to Scholarship]
    
    AddStudent --> SaveStudent[Save to Database]
    EditStudent --> SaveStudent
    AssignScholar --> SaveStudent
    SaveStudent --> Students
    DeleteStudent --> Students
    ViewStudent --> Students
    
    Scholarships --> ScholarAction{Scholarship Action}
    ScholarAction -->|Add| AddScholar[Create Scholarship]
    ScholarAction -->|Edit| EditScholar[Update Scholarship]
    ScholarAction -->|Delete| DeleteScholar[Remove Scholarship]
    ScholarAction -->|View| ViewScholar[View Details]
    
    AddScholar --> SaveScholar[Save to Database]
    EditScholar --> SaveScholar
    SaveScholar --> Scholarships
    DeleteScholar --> Scholarships
    ViewScholar --> Scholarships
    
    Reports --> ReportType{Report Type}
    ReportType -->|Student Report| StudentReport[Generate Student Report]
    ReportType -->|Scholarship Report| ScholarReport[Generate Scholarship Report]
    ReportType -->|Detailed Report| DetailedReport[Generate Detailed Report]
    
    StudentReport --> ExportFormat{Export Format}
    ScholarReport --> ExportFormat
    DetailedReport --> ExportFormat
    
    ExportFormat -->|PDF| ExportPDF[Download PDF]
    ExportFormat -->|Excel| ExportExcel[Download XLSX]
    ExportFormat -->|CSV| ExportCSV[Download CSV]
    
    ExportPDF --> Reports
    ExportExcel --> Reports
    ExportCSV --> Reports
    
    Students --> Dashboard
    Scholarships --> Dashboard
    Reports --> Dashboard
    
    Logout --> End([End: Session Terminated])
    
    style Start fill:#90EE90
    style End fill:#FFB6C1
    style Dashboard fill:#87CEEB
    style Students fill:#DDA0DD
    style Scholarships fill:#F0E68C
    style Reports fill:#FFD700
    style Login fill:#FFA07A
    style Auth fill:#98FB98
```

### Flowchart Legend
- 🟢 **Green**: Start point
- 🔵 **Blue**: Main dashboard
- 🟣 **Purple**: Student operations
- 🟡 **Yellow**: Scholarship operations
- 🟠 **Orange**: Reports and exports
- 🔴 **Pink**: End point

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
