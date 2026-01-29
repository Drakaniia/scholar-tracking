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
import { useState, useEffect } from 'react';

const STUDENT_STATUSES = ['Active', 'Inactive', 'Graduated', 'On Leave'] as const;
const SCHOLARSHIP_STATUSES = ['Active', 'Completed', 'Suspended'] as const;

interface Scholarship {
    id: number;
    scholarshipName: string;
    type: string;
    source: string;
    amount: number;
}

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
    const [scholarships, setScholarships] = useState<Scholarship[]>([]);
    const [loadingScholarships, setLoadingScholarships] = useState(false);
    const [selectedScholarship, setSelectedScholarship] = useState<number | null>(
        defaultValues?.scholarshipId || null
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
            scholarshipId: null,
            awardDate: null,
            startTerm: null,
            endTerm: null,
            grantAmount: null,
            scholarshipStatus: null,
            ...defaultValues,
        },
    });

    useEffect(() => {
        fetchScholarships();
    }, []);

    const fetchScholarships = async () => {
        setLoadingScholarships(true);
        try {
            const res = await fetch('/api/scholarships?limit=100&status=Active');
            const data = await res.json();
            if (data.success) {
                setScholarships(data.data);
            }
        } catch (error) {
            console.error('Error fetching scholarships:', error);
        } finally {
            setLoadingScholarships(false);
        }
    };

    const handleGradeLevelChange = (value: GradeLevel) => {
        setSelectedGradeLevel(value);
        form.setValue('gradeLevel', value);
        form.setValue('yearLevel', YEAR_LEVELS[value][0]);
    };

    const handleScholarshipChange = (value: string) => {
        if (value === 'none') {
            setSelectedScholarship(null);
            form.setValue('scholarshipId', null);
            form.setValue('awardDate', null);
            form.setValue('startTerm', null);
            form.setValue('endTerm', null);
            form.setValue('grantAmount', null);
            form.setValue('scholarshipStatus', null);
        } else {
            const scholarshipId = parseInt(value);
            setSelectedScholarship(scholarshipId);
            form.setValue('scholarshipId', scholarshipId);
            
            const scholarship = scholarships.find(s => s.id === scholarshipId);
            if (scholarship) {
                form.setValue('grantAmount', scholarship.amount);
                form.setValue('scholarshipStatus', 'Active');
                form.setValue('awardDate', new Date());
            }
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
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

            {/* Scholarship Assignment Section */}
            <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-sm">Scholarship Assignment (Optional)</h3>
                
                <div className="space-y-2">
                    <Label htmlFor="scholarship">Scholarship</Label>
                    <Select 
                        value={selectedScholarship?.toString() || 'none'} 
                        onValueChange={handleScholarshipChange}
                        disabled={loadingScholarships}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={loadingScholarships ? "Loading..." : "Select scholarship"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Scholarship</SelectItem>
                            {scholarships.map((scholarship) => (
                                <SelectItem key={scholarship.id} value={scholarship.id.toString()}>
                                    {scholarship.scholarshipName} ({scholarship.type} - {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedScholarship && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startTerm">Start Term</Label>
                                <Input
                                    id="startTerm"
                                    {...form.register('startTerm')}
                                    placeholder="1st Semester 2025-2026"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endTerm">End Term</Label>
                                <Input
                                    id="endTerm"
                                    {...form.register('endTerm')}
                                    placeholder="2nd Semester 2025-2026"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="grantAmount">Grant Amount</Label>
                                <Input
                                    id="grantAmount"
                                    type="number"
                                    {...form.register('grantAmount', { valueAsNumber: true })}
                                    placeholder="10000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="scholarshipStatus">Scholarship Status</Label>
                                <Controller
                                    name="scholarshipStatus"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select value={field.value || 'Active'} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SCHOLARSHIP_STATUSES.map((status) => (
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
                    </>
                )}
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
