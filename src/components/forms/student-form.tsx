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
import { YEAR_LEVELS, GRADE_LEVELS, GRADE_LEVEL_LABELS, CreateStudentInput, GradeLevel } from '@/types';
import { useState } from 'react';

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
    const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel>(
        defaultValues?.gradeLevel || 'COLLEGE'
    );

    const form = useForm<CreateStudentInput>({
        defaultValues: {
            studentNo: '',
            lastName: '',
            firstName: '',
            middleInitial: '',
            program: '',
            gradeLevel: 'COLLEGE',
            yearLevel: '1st Year',
            status: 'Active',
            ...defaultValues,
        },
    });

    const handleGradeLevelChange = (value: GradeLevel) => {
        setSelectedGradeLevel(value);
        form.setValue('gradeLevel', value);
        // Reset year level to first option of new grade level
        form.setValue('yearLevel', YEAR_LEVELS[value][0]);
    };

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

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                        id="lastName"
                        {...form.register('lastName', { required: true })}
                        placeholder="Dela Cruz"
                    />
                </div>
                <div className="space-y-2 col-span-1">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                        id="firstName"
                        {...form.register('firstName', { required: true })}
                        placeholder="Juan"
                    />
                </div>
                <div className="space-y-2 col-span-1">
                    <Label htmlFor="middleInitial">M.I.</Label>
                    <Input
                        id="middleInitial"
                        {...form.register('middleInitial')}
                        placeholder="S"
                        maxLength={1}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="program">Program</Label>
                <Input
                    id="program"
                    {...form.register('program', { required: true })}
                    placeholder="Bachelor of Science in Computer Science"
                />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="gradeLevel">Grade Level</Label>
                    <Controller
                        name="gradeLevel"
                        control={form.control}
                        render={({ field }) => (
                            <Select 
                                value={field.value} 
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    handleGradeLevelChange(value as GradeLevel);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {GRADE_LEVELS.map((level) => (
                                        <SelectItem key={level} value={level}>
                                            {GRADE_LEVEL_LABELS[level]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
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
                                    {YEAR_LEVELS[selectedGradeLevel].map((level) => (
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
