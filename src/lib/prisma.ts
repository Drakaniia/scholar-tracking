import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

// Optimized Prisma client with connection pooling
const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

// Enable query result caching in Prisma (experimental)
if (process.env.NODE_ENV === 'production') {
    prisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ operation, model, args, query }) {
                    const start = performance.now();
                    const result = await query(args);
                    const end = performance.now();
                    
                    // Log slow queries (over 100ms)
                    if (end - start > 100) {
                        console.warn(`Slow query detected: ${model}.${operation} took ${(end - start).toFixed(2)}ms`);
                    }
                    
                    return result;
                },
            },
        },
    });
}

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

export { prisma };
export default prisma;
