'use client';

import { useForm, Controller } from 'react-hook-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS, GRADE_LEVELS, GRADE_LEVEL_LABELS, CreateScholarshipInput, GradeLevel } from '@/types';

const SCHOLARSHIP_STATUSES = ['Active', 'Inactive', 'Closed'] as const;

interface ScholarshipFormProps {
    defaultValues?: Partial<CreateScholarshipInput>;
    onSubmit: (data: CreateScholarshipInput) => void;
    onCancel: () => void;
    isEditing?: boolean;
    loading?: boolean;
}

export function ScholarshipForm({
    defaultValues,
    onSubmit,
    onCancel,
    isEditing = false,
    loading = false,
}: ScholarshipFormProps) {
    const [showCustomType, setShowCustomType] = useState(
        defaultValues?.type && !['PAEB', 'CHED', 'LGU', 'SCHOOL_GRANT'].includes(defaultValues.type)
    );
    const [customType, setCustomType] = useState(
        defaultValues?.type && !['PAEB', 'CHED', 'LGU', 'SCHOOL_GRANT'].includes(defaultValues.type)
            ? defaultValues.type 
            : ''
    );
    const [selectedGradeLevels, setSelectedGradeLevels] = useState<GradeLevel[]>(
        defaultValues?.eligibleGradeLevels?.split(',').map(l => l.trim() as GradeLevel) || []
    );
    const [selectedPrograms, setSelectedPrograms] = useState<string[]>(
        defaultValues?.eligiblePrograms?.split(',').map(p => p.trim()) || []
    );

    const form = useForm<CreateScholarshipInput>({
        defaultValues: {
            scholarshipName: '',
            sponsor: '',
            type: 'PAEB',
            source: 'INTERNAL',
            eligibleGradeLevels: '',
            eligiblePrograms: '',
            amount: 0,
            requirements: '',
            status: 'Active',
            startDate: null,
            endDate: null,
            ...defaultValues,
        },
    });

    const handleTypeChange = (value: string) => {
        if (value === 'OTHER') {
            setShowCustomType(true);
            form.setValue('type', '');
        } else {
            setShowCustomType(false);
            setCustomType('');
            form.setValue('type', value);
        }
    };

    const handleCustomTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomType(value);
        form.setValue('type', value);
    };

    const handleGradeLevelToggle = (level: GradeLevel) => {
        const updated = selectedGradeLevels.includes(level)
            ? selectedGradeLevels.filter(l => l !== level)
            : [...selectedGradeLevels, level];
        setSelectedGradeLevels(updated);
        form.setValue('eligibleGradeLevels', updated.join(','));
    };

    const handleProgramToggle = (program: string) => {
        const updated = selectedPrograms.includes(program)
            ? selectedPrograms.filter(p => p !== program)
            : [...selectedPrograms, program];
        setSelectedPrograms(updated);
        form.setValue('eligiblePrograms', updated.join(','));
    };

    const handleFormSubmit = (data: CreateScholarshipInput) => {
        if (showCustomType && customType) {
            data.type = customType;
        }
        data.eligibleGradeLevels = selectedGradeLevels.join(',');
        data.eligiblePrograms = selectedPrograms.length > 0 ? selectedPrograms.join(',') : null;
        onSubmit(data);
    };

    return (
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
                <Label htmlFor="scholarshipName">Scholarship Name</Label>
                <Input
                    id="scholarshipName"
                    {...form.register('scholarshipName', { required: true })}
                    placeholder="Academic Excellence Award"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="sponsor">Sponsor</Label>
                <Input
                    id="sponsor"
                    {...form.register('sponsor', { required: true })}
                    placeholder="University Foundation"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Controller
                        name="type"
                        control={form.control}
                        render={({ field }) => (
                            <>
                                <Select 
                                    value={showCustomType ? 'OTHER' : field.value} 
                                    onValueChange={handleTypeChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PAEB">PAEB</SelectItem>
                                        <SelectItem value="CHED">CHED</SelectItem>
                                        <SelectItem value="LGU">LGU</SelectItem>
                                        <SelectItem value="SCHOOL_GRANT">School Grant</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {showCustomType && (
                                    <Input
                                        placeholder="Enter custom type"
                                        value={customType}
                                        onChange={handleCustomTypeChange}
                                        className="mt-2"
                                        required
                                    />
                                )}
                            </>
                        )}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Controller
                        name="source"
                        control={form.control}
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SCHOLARSHIP_SOURCES.map((source) => (
                                        <SelectItem key={source} value={source}>
                                            {SCHOLARSHIP_SOURCE_LABELS[source]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Eligible Grade Levels</Label>
                <div className="grid grid-cols-2 gap-3 p-3 border rounded-md">
                    {GRADE_LEVELS.map((level) => (
                        <div key={level} className="flex items-center space-x-2">
                            <Checkbox
                                id={level}
                                checked={selectedGradeLevels.includes(level)}
                                onCheckedChange={() => handleGradeLevelToggle(level)}
                            />
                            <Label htmlFor={level} className="text-sm font-normal cursor-pointer">
                                {GRADE_LEVEL_LABELS[level]}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Show program selection only if college is selected */}
            {selectedGradeLevels.includes('COLLEGE') && (
                <div className="space-y-2">
                    <Label>Eligible Programs (Leave empty for all programs)</Label>
                    <div className="grid grid-cols-2 gap-3 p-3 border rounded-md">
                        {['BS Education', 'BA Education', 'BS Computer Science', 'BS Information Technology', 'BS Nursing', 'BS Accountancy'].map((program) => (
                            <div key={program} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`program-${program}`}
                                    checked={selectedPrograms.includes(program)}
                                    onCheckedChange={() => handleProgramToggle(program)}
                                />
                                <Label htmlFor={`program-${program}`} className="text-sm font-normal cursor-pointer">
                                    {program}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        {...form.register('amount', { valueAsNumber: true })}
                        placeholder="10000"
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

            <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                    id="requirements"
                    {...form.register('requirements')}
                    placeholder="Minimum GWA of 1.5, enrolled in any degree program..."
                    rows={3}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                        id="startDate"
                        type="date"
                        {...form.register('startDate', { valueAsDate: true })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                        id="endDate"
                        type="date"
                        {...form.register('endDate', { valueAsDate: true })}
                    />
                </div>
            </div>

            <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
                    {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                </Button>
            </DialogFooter>
        </form>
    );
}
