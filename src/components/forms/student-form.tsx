'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { YEAR_LEVELS, EDUCATION_LEVELS, CreateStudentInput } from '@/types';

interface StudentFormProps {
    defaultValues?: Partial<CreateStudentInput>;
    onSubmit: (data: CreateStudentInput) => void;
    onCancel: () => void;
    isEditing?: boolean;
    loading?: boolean;
}

export function StudentForm({
    defaultValues,
    onSubmit,
    onCancel,
    isEditing = false,
    loading = false,
}: StudentFormProps) {
    const form = useForm<CreateStudentInput>({
        defaultValues: {
            firstName: '',
            middleName: '',
            lastName: '',
            yearLevel: '1st Year',
            course: '',
            tuitionFee: 0,
            educationLevel: 'College',
            ...defaultValues,
        },
    });

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                        id="firstName"
                        {...form.register('firstName', { required: true })}
                        placeholder="Juan"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                        id="middleName"
                        {...form.register('middleName')}
                        placeholder="Santos"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                    id="lastName"
                    {...form.register('lastName', { required: true })}
                    placeholder="Dela Cruz"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="educationLevel">Education Level</Label>
                    <Select
                        value={form.watch('educationLevel')}
                        onValueChange={(value) => form.setValue('educationLevel', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {EDUCATION_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>
                                    {level}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="yearLevel">Year Level</Label>
                    <Select
                        value={form.watch('yearLevel')}
                        onValueChange={(value) => form.setValue('yearLevel', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {YEAR_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>
                                    {level}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="course">Course/Program</Label>
                <Input
                    id="course"
                    {...form.register('course', { required: true })}
                    placeholder="Bachelor of Science in Computer Science"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="tuitionFee">Tuition Fee (₱)</Label>
                <Input
                    id="tuitionFee"
                    type="number"
                    min="0"
                    step="0.01"
                    {...form.register('tuitionFee', { valueAsNumber: true })}
                    placeholder="50000"
                />
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                </Button>
            </DialogFooter>
        </form>
    );
}
