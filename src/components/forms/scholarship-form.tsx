'use client';

import { useForm, Controller } from 'react-hook-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { SCHOLARSHIP_TYPES, CreateScholarshipInput } from '@/types';

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
        defaultValues?.type && !SCHOLARSHIP_TYPES.includes(defaultValues.type as 'PAED' | 'CHED' | 'LGU')
    );
    const [customType, setCustomType] = useState(
        defaultValues?.type && !SCHOLARSHIP_TYPES.includes(defaultValues.type as 'PAED' | 'CHED' | 'LGU') 
            ? defaultValues.type 
            : ''
    );

    const form = useForm<CreateScholarshipInput>({
        defaultValues: {
            scholarshipName: '',
            sponsor: '',
            type: 'PAED',
            amount: 0,
            requirements: '',
            status: 'Active',
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

    const handleFormSubmit = (data: CreateScholarshipInput) => {
        if (showCustomType && customType) {
            data.type = customType;
        }
        onSubmit(data);
    };

    return (
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
                                        {SCHOLARSHIP_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
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
                <Label htmlFor="amount">Amount (₱)</Label>
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
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                    id="requirements"
                    {...form.register('requirements')}
                    placeholder="Minimum GWA of 1.5, enrolled in any degree program..."
                    rows={3}
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
