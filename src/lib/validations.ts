// Validation schemas and helpers

import { CreateStudentInput, CreateScholarshipInput } from '@/types';

export function validateStudent(data: Partial<CreateStudentInput>): string[] {
    const errors: string[] = [];

    if (!data.firstName?.trim()) {
        errors.push('First name is required');
    }

    if (!data.lastName?.trim()) {
        errors.push('Last name is required');
    }

    if (!data.course?.trim()) {
        errors.push('Course is required');
    }

    if (!data.yearLevel) {
        errors.push('Year level is required');
    }

    if (!data.educationLevel) {
        errors.push('Education level is required');
    }

    if (data.tuitionFee !== undefined && data.tuitionFee < 0) {
        errors.push('Tuition fee cannot be negative');
    }

    return errors;
}

export function validateScholarship(
    data: Partial<CreateScholarshipInput>
): string[] {
    const errors: string[] = [];

    if (!data.name?.trim()) {
        errors.push('Scholarship name is required');
    }

    if (!data.type) {
        errors.push('Scholarship type is required');
    }

    if (data.type === 'External' && !data.category) {
        errors.push('Category is required for external scholarships');
    }

    if (data.amount === undefined || data.amount <= 0) {
        errors.push('Amount must be greater than 0');
    }

    if (data.applicationStart && data.applicationEnd) {
        const start = new Date(data.applicationStart);
        const end = new Date(data.applicationEnd);
        if (start > end) {
            errors.push('Application start date must be before end date');
        }
    }

    return errors;
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidPhoneNumber(phone: string): boolean {
    // Philippine phone number format
    const phoneRegex = /^(09|\+639)\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}
