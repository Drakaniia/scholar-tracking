/**
 * Formatting Utilities
 * Currency, date, and text formatting helpers
 */

/**
 * Format a number as currency (PHP)
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(amount);
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(date));
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}
