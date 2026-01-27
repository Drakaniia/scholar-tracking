# ERD Generation Guide

## Overview
The Entity Relationship Diagram (ERD) is generated using `prisma-erd-generator` which creates a visual representation of the database schema.

## Important Notes

⚠️ **ERD generation is disabled in production builds** to avoid Puppeteer/Chrome dependency issues on Vercel.

## Local ERD Generation

To generate the ERD locally:

```bash
npm run erd:generate
```

This command uses `prisma/schema-with-erd.prisma` which includes the ERD generator configuration.

## Viewing the ERD

After generation, you can view the ERD:

```bash
npm run erd:view
```

Or open `docs/index.html` in your browser.

## Files

- `prisma/schema.prisma` - Main schema (ERD generator disabled for production)
- `prisma/schema-with-erd.prisma` - Schema with ERD generator (for local use only)
- `docs/ERD.svg` - Generated ERD diagram (committed to git)
- `docs/index.html` - Interactive ERD viewer

## Production Deployment

The ERD.svg file is committed to the repository, so it's available in production without needing to regenerate it during the build process.

## Updating the ERD

When you make schema changes:

1. Update `prisma/schema.prisma` (main schema)
2. Copy changes to `prisma/schema-with-erd.prisma`
3. Run `npm run erd:generate` to regenerate the ERD
4. Commit both schema files and the updated `docs/ERD.svg`
