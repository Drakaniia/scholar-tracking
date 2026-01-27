# Database Documentation

## Entity Relationship Diagram (ERD)

This folder contains the automatically generated Entity Relationship Diagram for the Scholarship Tracking System database.

### Files

- **ERD.svg** - The database schema visualization (auto-generated)
- **index.html** - Interactive viewer for the ERD with zoom controls

### How to View

#### Option 1: Open in Browser (Recommended)
```bash
# Open the HTML viewer
start docs/index.html
# or
open docs/index.html  # macOS
xdg-open docs/index.html  # Linux
```

#### Option 2: View SVG Directly
```bash
# Open the SVG file
start docs/ERD.svg
```

#### Option 3: Use npm script
```bash
npm run erd:view
```

### How to Regenerate

Whenever you update your Prisma schema, regenerate the ERD:

```bash
npx prisma generate
```

Or use the npm script:

```bash
npm run erd:generate
```

### Customization

You can customize the ERD appearance by modifying the generator in `prisma/schema.prisma`:

```prisma
generator erd {
  provider = "prisma-erd-generator"
  output   = "../docs/ERD.svg"
  theme    = "forest"  // Options: default, forest, dark, neutral
}
```

Available themes:
- `default` - Clean white background
- `forest` - Green theme (current)
- `dark` - Dark mode
- `neutral` - Gray theme

### Database Tables

The ERD shows the following tables and their relationships:

1. **User** - Authentication and user management
2. **Session** - User login sessions
3. **AuditLog** - System activity tracking
4. **Student** - Student information
5. **Scholarship** - Scholarship programs
6. **Disbursement** - Payment tracking
7. **StudentFees** - Fee breakdown and subsidies

### Relationships

- User → Session (One-to-Many)
- User → AuditLog (One-to-Many)
- Student → Scholarship (Many-to-One)
- Student → StudentFees (One-to-Many)
- Student → Disbursement (One-to-Many)
- Scholarship → Disbursement (One-to-Many)

### Tips

- Use the zoom controls in the HTML viewer for better visibility
- Download the SVG for presentations or documentation
- The ERD updates automatically when you run `npx prisma generate`
- Keep this documentation in sync with schema changes
