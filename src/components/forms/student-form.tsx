'use client';

import { useForm, Controller } from 'react-hook-form';
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
import { YEAR_LEVELS, CreateStudentInput } from '@/types';

const STUDENT_STATUSES = ['Active', 'Inactive', 'Graduated', 'On Leave'] as const;

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
            studentNo: '',
            fullName: '',
            program: '',
            yearLevel: '1st Year',
            email: '',
            status: 'Active',
            ...defaultValues,
        },
    });

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="studentNo">Student No.</Label>
                <Input
                    id="studentNo"
                    {...form.register('studentNo', { required: true })}
                    placeholder="e.g., STU-2024-001"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                    id="fullName"
                    {...form.register('fullName', { required: true })}
                    placeholder="Juan Santos Dela Cruz"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    {...form.register('email', { required: true })}
                    placeholder="student@email.com"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="program">Program</Label>
                <Input
                    id="program"
                    {...form.register('program', { required: true })}
                    placeholder="Bachelor of Science in Computer Science"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="yearLevel">Year Level</Label>
                    <Controller
                        name="yearLevel"
                        control={form.control}
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
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
                        )}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Controller
                        name="status"
                        control={form.control}
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STUDENT_STATUSES.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
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
