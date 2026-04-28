# ScholarTrack - Complete Setup Guide

This guide will walk you through setting up the ScholarTrack scholarship management system from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Clone the Repository](#clone-the-repository)
3. [Install Dependencies](#install-dependencies)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Initialize Database](#initialize-database)
7. [Start Development Server](#start-development-server)
8. [Default Login Credentials](#default-login-credentials)
9. [Run Prisma Console](#run-prisma-console-optional)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Software | Version | Download Link |
|----------|---------|---------------|
| **Node.js** | 18.x or higher | [https://nodejs.org/](https://nodejs.org/) |
| **npm** | 9.x or higher | (Comes with Node.js) |
| **PostgreSQL** | 14.x or higher | [https://www.postgresql.org/download/](https://www.postgresql.org/download/) |
| **Git** | Latest | [https://git-scm.com/](https://git-scm.com/) |

### Verify Installation

Open your terminal and run:

```bash
node --version
npm --version
git --version
```

All commands should return version numbers. If not, install the missing software.

---

## Clone the Repository

### Step 1: Navigate to Your Projects Directory

```bash
cd /path/to/your/projects
```

### Step 2: Clone the Repository

```bash
git clone <repository-url> scholarship-tracking-system
```

### Step 3: Navigate to Project Directory

```bash
cd scholarship-tracking-system
```

---

## Install Dependencies

Install all required npm packages:

```bash
npm install
```

This may take a few minutes. The command will create a `node_modules` folder with all dependencies.

---

## Environment Configuration

### Step 1: Check for .env.example

The project may include an `.env.example` file as a template. Check if it exists:

```bash
# On Windows (PowerShell)
ls .env.example

# On Windows (Command Prompt)
dir .env.example

# On macOS/Linux
ls -la .env.example
```

### Step 2: Create .env File

Copy `.env.example` to `.env`:

```bash
# On Windows (PowerShell)
Copy-Item .env.example .env

# On Windows (Command Prompt)
copy .env.example .env

# On macOS/Linux
cp .env.example .env
```

**If `.env.example` doesn't exist**, create a new `.env` file manually:

```bash
# Create empty .env file
type nul > .env    # Windows Command Prompt
echo $null > .env  # Windows PowerShell
touch .env         # macOS/Linux
```

### Step 3: Configure Environment Variables

Open the `.env` file in your text editor and add the following:

```env
# Prisma Accelerate URL with optimized connection pooling (for production)
DATABASE_URL="prisma+postgres://your-database-host:port/dbname?api_key=your-api-key&connection_limit=10&pool_timeout=20&connect_timeout=10"

# Direct PostgreSQL connection (for Prisma Studio, migrations, local development)
DIRECT_DATABASE_URL="postgres://user:password@host:port/dbname?sslmode=require"

# Database connection pool settings
DB_CONNECTION_LIMIT=10

# Authentication Configuration
JWT_SECRET="your-secure-secret-key-min-32-characters-long"
SESSION_SECRET="your-session-secret-min-32-characters"
NEXTAUTH_URL="http://localhost:8080"
NEXTAUTH_SECRET="your-nextauth-secret-min-32-characters"

# Security Settings
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
SESSION_DURATION_HOURS=8
```

### Step 4: Generate Secure Secrets

Generate secure random strings for your secrets:

**Option 1: Using Node.js**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command 4 times to generate:
- `JWT_SECRET`
- `SESSION_SECRET`
- `NEXTAUTH_SECRET`

**Option 2: Using OpenSSL (macOS/Linux)**

```bash
openssl rand -hex 32
```

**Option 3: Using Online Generator**

Visit: [https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)

---

## Database Setup

### Using Prisma Cloud

#### Step 1: Create a Free Prisma Account

1. Visit [Prisma Data Cloud](https://prisma.io)
2. Sign up for a free account
3. Create a new database project

---

#### Step 2: Get Your Database URL

**[📷 INSERT SCREENSHOT: Prisma Dashboard - Database Project Overview]**

*Caption: Navigate to your project dashboard and click on "Connection Details"*

---

**[📷 INSERT SCREENSHOT: Connection String Modal]**

*Caption: Click "Copy Connection String" to copy your database URL*

---

#### Step 3: Copy the Connection Strings

You'll receive two connection strings:

**Prisma Accelerate URL** (with connection pooling):
```
prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY&connection_limit=10&pool_timeout=20&connect_timeout=10
```

**Direct Connection URL** (for Prisma Studio):
```
postgres://user:password@host:port/database?sslmode=require
```

---

#### Step 4: Update .env File

Open your `.env` file and replace the placeholder values:

```env
# Prisma Accelerate URL (for the application)
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY&connection_limit=10&pool_timeout=20&connect_timeout=10"

# Direct PostgreSQL connection (for Prisma Studio)
DIRECT_DATABASE_URL="postgres://user:password@host:port/database?sslmode=require"
```

---

**[📷 INSERT SCREENSHOT: .env File with Database URLs]**

*Caption: Example of properly configured .env file with Prisma connection strings*

---

## Initialize Database

### Step 1: Generate Prisma Client

```bash
npx prisma generate
```

This generates the Prisma Client based on your schema.

### Step 2: Push Schema to Database

```bash
npm run db:push
```

This creates all database tables based on the Prisma schema.

**Expected Output:**
```
Your database is now in sync with your schema.
```

### Step 3: Seed the Database

```bash
npm run db:seed
```

This populates your database with initial data including:
- Default admin user
- Sample scholarships
- Sample students
- Academic years

**Expected Output:**
```
🌱 Seeded 10 students, 5 scholarships, and 1 admin user
```

---

## Start Development Server

### Start the App

```bash
npm run dev
```

This starts the Next.js development server with webpack on port **8080**.

**Expected Output:**
```
> scholarship-tracking-system@0.1.0 dev
> next dev --webpack -p 8080

   ▲ Next.js 16.1.6
   - Local:        http://localhost:8080
   - Ready in 3500ms
```

### Access the Application

Open your browser and navigate to:

```
http://localhost:8080
```

### Login to the Application

Use the default admin credentials (after seeding):

| Username | Password   | Role  |
|----------|------------|-------|
| `admin`  | `admin123` | ADMIN |
| `user`   | `user123`  | STAFF |

⚠️ **Security Warning**: Change these credentials immediately in production!

---

## Run Prisma Console (Optional)

To interact with your database using Prisma's interactive console:

```bash
npx prisma studio
```

This opens the Prisma Studio web interface at `http://localhost:5555` where you can:

- ✅ View and browse all database tables
- ✅ Create, edit, and delete records
- ✅ View relationships between models
- ✅ Run raw SQL queries

**To close Prisma Studio:** Press `Ctrl + C` in the terminal.

---

**Happy Tracking! 🎓**
