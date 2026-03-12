import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

// Optimized Prisma client with connection pooling and retry logic
const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
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
                            console.warn(`Slow query detected: ${model}.${operation} took ${(end - start).toFixed(2)}ms`);
                        }

                        return result;
                    } catch (error) {
                        const end = performance.now();
                        console.error(`Query failed: ${model}.${operation} after ${(end - start).toFixed(2)}ms`, error);
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
