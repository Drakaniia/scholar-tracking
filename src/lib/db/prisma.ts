/**
 * Prisma Client Singleton
 * Ensures a single Prisma client instance in development to prevent connection exhaustion
 */

import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

export { prisma };
export default prisma;
