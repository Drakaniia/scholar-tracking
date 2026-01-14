// Validation schemas and helpers

import { CreateStudentInput, CreateScholarshipInput } from '@/types';

export function validateStudent(data: Partial<CreateStudentInput>): string[] {
    const errors: string[] = [];

    if (!data.fullName?.trim()) {
        errors.push('Full name is required');
    }

    if (!data.studentNo?.trim()) {
        errors.push('Student number is required');
    }

    if (!data.program?.trim()) {
        errors.push('Program is required');
    }

    if (!data.yearLevel) {
        errors.push('Year level is required');
    }

    if (!data.email?.trim()) {
        errors.push('Email is required');
    }

    return errors;
}

export function validateScholarship(
    data: Partial<CreateScholarshipInput>
): string[] {
    const errors: string[] = [];

    if (!data.scholarshipName?.trim()) {
        errors.push('Scholarship name is required');
    }

    if (!data.sponsor?.trim()) {
        errors.push('Sponsor is required');
    }

    if (!data.type) {
        errors.push('Scholarship type is required');
    }

    if (data.amount === undefined || data.amount <= 0) {
        errors.push('Amount must be greater than 0');
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
