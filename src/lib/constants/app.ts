/**
 * Application Constants
 * Core application configuration and settings
 */

export const APP_NAME = 'ScholarTrack';
export const APP_DESCRIPTION = 'Scholarship Tracking System';
export const APP_VERSION = '1.0.0';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Status Colors for Badges
export const STATUS_COLORS = {
    Pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        darkBg: 'dark:bg-yellow-900',
        darkText: 'dark:text-yellow-300',
    },
    Approved: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        darkBg: 'dark:bg-green-900',
        darkText: 'dark:text-green-300',
    },
    Rejected: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        darkBg: 'dark:bg-red-900',
        darkText: 'dark:text-red-300',
    },
    Expired: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        darkBg: 'dark:bg-gray-900',
        darkText: 'dark:text-gray-300',
    },
} as const;
