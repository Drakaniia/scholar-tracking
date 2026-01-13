# Project Commands

This reference guide lists all available commands for development, database management, and building the application.

## Development

### Start Development Server

Runs the application in development mode with hot-reloading.

- **Default (Both Portals):**

  ```bash
  npm run dev
  ```

  Runs on [http://localhost:3000](http://localhost:3000).

- **Admin Portal Focus:**

  ```bash
  npm run dev:admin
  ```

  Runs on [http://localhost:3000](http://localhost:3000). Use this for admin/staff workflows.

- **Student Portal Focus:**
  ```bash
  npm run dev:web
  ```
  Runs on [http://localhost:3001](http://localhost:3001). Use this for student workflows. Allows testing both roles simultaneously when used with `dev:admin`.

## Database Management (Prisma)

### Push Schema Changes

Applies changes from `prisma/schema.prisma` to the database without creating a migration. Best for prototyping.

```bash
npm run db:push
```

### Seed Database

Populates the database with initial/sample data (e.g., test users, scholarship programs).

```bash
npm run db:seed
```

### Prisma Studio

Opens a visual database editor in your browser.

```bash
npm run db:studio
```

## Production

### Build Application

Compiles the application for production deployment.

```bash
npm run build
```

### Start Production Server

Runs the built application in production mode.

```bash
npm run start
```

## Code Quality

### Linting

Runs ESLint to catch code errors and enforce style.

```bash
npm run lint
```
