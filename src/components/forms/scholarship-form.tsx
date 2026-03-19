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
import { DialogFooter, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS, GRADE_LEVELS, GRADE_LEVEL_LABELS, CreateScholarshipInput, GradeLevel, GRANT_TYPES, GRANT_TYPE_LABELS, GrantType } from '@/types';

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
    const [selectedGrantType, setSelectedGrantType] = useState<GrantType>(
        defaultValues?.grantType || 'FULL'
    );
    const [coversTuition, setCoversTuition] = useState(
        defaultValues?.coversTuition || false
    );
    const [coversMiscellaneous, setCoversMiscellaneous] = useState(
        defaultValues?.coversMiscellaneous || false
    );
    const [coversLaboratory, setCoversLaboratory] = useState(
        defaultValues?.coversLaboratory || false
    );
    const [coversOther, setCoversOther] = useState(
        defaultValues?.coversOther || false
    );
    const [otherFeeName, setOtherFeeName] = useState(
        defaultValues?.otherFeeName || ''
    );
    const [showOtherFeeDialog, setShowOtherFeeDialog] = useState(false);
    const [tuitionFee, setTuitionFee] = useState(
        defaultValues?.tuitionFee || 0
    );
    const [miscellaneousFee, setMiscellaneousFee] = useState(
        defaultValues?.miscellaneousFee || 0
    );
    const [laboratoryFee, setLaboratoryFee] = useState(
        defaultValues?.laboratoryFee || 0
    );
    const [otherFee, setOtherFee] = useState(
        defaultValues?.otherFee || 0
    );
    const [amountSubsidy, setAmountSubsidy] = useState(
        defaultValues?.amountSubsidy || 0
    );

    // Calculate total fees
    const totalFees = tuitionFee + miscellaneousFee + laboratoryFee + otherFee;

    // Calculate percent subsidy from amount subsidy (amount / total fees)
    // Result is in decimal form (e.g., 0.1667 for 16.67%)
    const calculatedPercentSubsidy = totalFees > 0 ? (amountSubsidy / totalFees) : 0;
    const percentSubsidyDisplay = calculatedPercentSubsidy.toFixed(4);

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
            grantType: 'FULL',
            coversTuition: false,
            coversMiscellaneous: false,
            coversLaboratory: false,
            coversOther: false,
            tuitionFee: 0,
            miscellaneousFee: 0,
            laboratoryFee: 0,
            otherFee: 0,
            amountSubsidy: 0,
            percentSubsidy: 0,
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

    const handleCoversOtherChange = (checked: boolean) => {
        setCoversOther(checked);
        if (checked && !otherFeeName) {
            // Open dialog to name the other fee
            setShowOtherFeeDialog(true);
        }
    };

    const handleOtherFeeNameSubmit = () => {
        if (otherFeeName.trim()) {
            setShowOtherFeeDialog(false);
        }
    };

    const handleFormSubmit = (data: CreateScholarshipInput) => {
        if (showCustomType && customType) {
            data.type = customType;
        }
        data.eligibleGradeLevels = selectedGradeLevels.join(',');
        data.eligiblePrograms = selectedPrograms.length > 0 ? selectedPrograms.join(',') : null;
        data.grantType = selectedGrantType;
        data.coversTuition = coversTuition;
        data.coversMiscellaneous = coversMiscellaneous;
        data.coversLaboratory = coversLaboratory;
        data.coversOther = coversOther;
        data.otherFeeName = coversOther ? otherFeeName : null;
        data.tuitionFee = tuitionFee;
        data.miscellaneousFee = miscellaneousFee;
        data.laboratoryFee = laboratoryFee;
        data.otherFee = otherFee;
        data.amountSubsidy = amountSubsidy;
        data.percentSubsidy = calculatedPercentSubsidy;
        onSubmit(data);
    };

    return (
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
                <Label htmlFor="scholarshipName">Scholarship Name</Label>
                <Input
                    id="scholarshipName"
                    {...form.register('scholarshipName', { required: true })}
                    placeholder="Enter scholarship name"
                    className="placeholder:text-muted-foreground/50"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="sponsor">Sponsor</Label>
                <Input
                    id="sponsor"
                    {...form.register('sponsor', { required: true })}
                    placeholder="Enter sponsor name"
                    className="placeholder:text-muted-foreground/50"
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
                                        className="mt-2 placeholder:text-muted-foreground/50"
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
                <div className="grid grid-cols-2 gap-3">
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
                    <div className="grid grid-cols-2 gap-3">
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

            <div className="space-y-2">
                <Label htmlFor="grantType">Grant Type</Label>
                <Controller
                    name="grantType"
                    control={form.control}
                    render={({ field }) => (
                        <Select value={field.value} onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedGrantType(value as GrantType);
                        }}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {GRANT_TYPES.map((grantType) => (
                                    <SelectItem key={grantType} value={grantType}>
                                        {GRANT_TYPE_LABELS[grantType]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                    {selectedGrantType === 'TUITION_ONLY' && 'Student gets free tuition but no cash grant.'}
                    {selectedGrantType === 'MISC_ONLY' && 'Student gets miscellaneous fees covered only.'}
                    {selectedGrantType === 'LAB_ONLY' && 'Student gets laboratory fees covered only.'}
                    {selectedGrantType === 'NONE' && 'Honorific scholarship with no financial benefits.'}
                    {selectedGrantType === 'FULL' && 'Student receives full cash grant and tuition coverage.'}
                </p>
            </div>

            {/* Show fee coverage options for non-FULL grant types */}
            {selectedGrantType !== 'FULL' && selectedGrantType !== 'NONE' && (
                <div className="space-y-2">
                    <Label>Covers</Label>
                    <div className="grid grid-cols-4 gap-3 p-3 border rounded-md">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="coversTuition"
                                checked={coversTuition}
                                onCheckedChange={(checked) => setCoversTuition(checked as boolean)}
                            />
                            <Label htmlFor="coversTuition" className="text-sm font-normal cursor-pointer">
                                Tuition
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="coversMiscellaneous"
                                checked={coversMiscellaneous}
                                onCheckedChange={(checked) => setCoversMiscellaneous(checked as boolean)}
                            />
                            <Label htmlFor="coversMiscellaneous" className="text-sm font-normal cursor-pointer">
                                Misc
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="coversLaboratory"
                                checked={coversLaboratory}
                                onCheckedChange={(checked) => setCoversLaboratory(checked as boolean)}
                            />
                            <Label htmlFor="coversLaboratory" className="text-sm font-normal cursor-pointer">
                                Lab
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="coversOther"
                                checked={coversOther}
                                onCheckedChange={(checked) => handleCoversOtherChange(checked as boolean)}
                            />
                            <Label htmlFor="coversOther" className="text-sm font-normal cursor-pointer">
                                Other
                            </Label>
                        </div>
                    </div>
                    {coversOther && otherFeeName && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Other fee name: <span className="font-medium">{otherFeeName}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-2 text-xs"
                                onClick={() => setShowOtherFeeDialog(true)}
                            >
                                Edit
                            </Button>
                        </p>
                    )}
                </div>
            )}

            {/* Fee Amount Inputs */}
            {(coversTuition || coversMiscellaneous || coversLaboratory || coversOther) && (
                <div className="space-y-2">
                    <Label>Fee Amounts</Label>
                    <div className="grid grid-cols-2 gap-4">
                        {coversTuition && (
                            <div className="space-y-2">
                                <Label htmlFor="tuitionFee">Tuition Fee (₱)</Label>
                                <CurrencyInput
                                    id="tuitionFee"
                                    value={tuitionFee}
                                    onChange={setTuitionFee}
                                    placeholder="Enter tuition fee amount"
                                    className="placeholder:text-muted-foreground/50"
                                />
                            </div>
                        )}
                        {coversMiscellaneous && (
                            <div className="space-y-2">
                                <Label htmlFor="miscellaneousFee">Miscellaneous Fee (₱)</Label>
                                <CurrencyInput
                                    id="miscellaneousFee"
                                    value={miscellaneousFee}
                                    onChange={setMiscellaneousFee}
                                    placeholder="Enter miscellaneous fee amount"
                                    className="placeholder:text-muted-foreground/50"
                                />
                            </div>
                        )}
                        {coversLaboratory && (
                            <div className="space-y-2">
                                <Label htmlFor="laboratoryFee">Laboratory Fee (₱)</Label>
                                <CurrencyInput
                                    id="laboratoryFee"
                                    value={laboratoryFee}
                                    onChange={setLaboratoryFee}
                                    placeholder="Enter laboratory fee amount"
                                    className="placeholder:text-muted-foreground/50"
                                />
                            </div>
                        )}
                        {coversOther && (
                            <div className="space-y-2">
                                <Label htmlFor="otherFee">{otherFeeName || 'Other'} Fee (₱)</Label>
                                <CurrencyInput
                                    id="otherFee"
                                    value={otherFee}
                                    onChange={setOtherFee}
                                    placeholder="Enter other fee amount"
                                    className="placeholder:text-muted-foreground/50"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Amount Input - Hidden for Free Tuition and None grant types */}
            {selectedGrantType !== 'TUITION_ONLY' && selectedGrantType !== 'NONE' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Controller
                            name="amount"
                            control={form.control}
                            render={({ field }) => (
                                <CurrencyInput
                                    id="amount"
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Enter cash grant amount"
                                    className="placeholder:text-muted-foreground/50"
                                />
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
            )}

            {/* Status Input - Shown alone for Free Tuition and None grant types */}
            {(selectedGrantType === 'TUITION_ONLY' || selectedGrantType === 'NONE') && (
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
            )}

            {/* Total Fees Display */}
            {totalFees > 0 && (
                <div className="p-3 bg-muted rounded-md">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Fees:</span>
                        <span className="text-lg font-semibold">₱{totalFees.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">Subsidy: ₱{amountSubsidy.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-xs font-medium text-primary">{percentSubsidyDisplay}% of total fees</span>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="amountSubsidy">Amount Subsidy (₱)</Label>
                <CurrencyInput
                    id="amountSubsidy"
                    value={amountSubsidy}
                    onChange={setAmountSubsidy}
                    placeholder="Enter subsidy amount"
                    className="placeholder:text-muted-foreground/50"
                />
                <p className="text-xs text-muted-foreground">
                    The actual subsidy amount in pesos. % Subsidy is automatically calculated in reports based on Total Fees.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                    id="requirements"
                    {...form.register('requirements')}
                    placeholder="Enter scholarship requirements"
                    rows={3}
                    className="placeholder:text-muted-foreground/50"
                />
            </div>

            {/* Other Fee Name Dialog */}
            <Dialog open={showOtherFeeDialog} onOpenChange={setShowOtherFeeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Name of Other Fee</DialogTitle>
                        <DialogDescription>
                            Enter the name of the other fee you want to cover (e.g., Library Fee, Sports Fee, etc.)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="otherFeeName">Fee Name</Label>
                            <Input
                                id="otherFeeName"
                                value={otherFeeName}
                                onChange={(e) => setOtherFeeName(e.target.value)}
                                placeholder="Enter fee name"
                                className="placeholder:text-muted-foreground/50"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowOtherFeeDialog(false);
                                setCoversOther(false);
                                setOtherFeeName('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleOtherFeeNameSubmit}
                            disabled={!otherFeeName.trim()}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
