/**
 * Lib Module - Main Entry Point
 *
 * Re-exports all utilities from submodules for convenient imports.
 *
 * Usage examples:
 *   import { prisma } from '@/lib'
 *   import { verifyToken, hashPassword } from '@/lib'
 *   import { cn, formatCurrency } from '@/lib'
 *   import { APP_NAME, EDUCATION_LEVEL_INFO } from '@/lib'
 *   import { validateStudent } from '@/lib'
 *
 * Or import from submodules directly:
 *   import { prisma } from '@/lib/db'
 *   import { verifyToken } from '@/lib/auth'
 *   import { cn } from '@/lib/utils'
 */

// Database
export * from './db';

// Authentication
export * from './auth';

// Utilities
export * from './utils';

// Constants
export * from './constants';

// Validations
export * from './validations';
