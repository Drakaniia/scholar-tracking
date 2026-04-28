import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

// Use default schema path
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

export default defineConfig({
  schema: schemaPath,
  datasource: {
    url: env('DIRECT_DATABASE_URL') || env('DATABASE_URL'),
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
});
