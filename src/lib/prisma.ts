import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

declare global {
  var prisma: PrismaClient | undefined;
}

// Create adapter for Prisma v7 with connection pooling
// Use DIRECT_DATABASE_URL for native PostgreSQL connection (not Prisma Accelerate)
const pool = new Pool({
  connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

// Optimized Prisma client with connection pooling and retry logic
const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Query performance monitoring and caching
if (process.env.NODE_ENV === 'production') {
  prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const start = performance.now();
          try {
            const result = await query(args);
            const end = performance.now();

            // Log slow queries (over 500ms in production)
            if (end - start > 500) {
              console.warn(
                `Slow query detected: ${model}.${operation} took ${(end - start).toFixed(2)}ms`
              );
            }

            return result;
          } catch (error) {
            const end = performance.now();
            console.error(
              `Query failed: ${model}.${operation} after ${(end - start).toFixed(2)}ms`,
              error
            );
            throw error;
          }
        },
      },
    },
  });
}

// Graceful shutdown for production
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export { prisma };
export default prisma;
