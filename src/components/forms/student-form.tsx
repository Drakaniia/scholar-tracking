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
import { Badge } from '@/components/ui/badge';
import { YEAR_LEVELS, GRADE_LEVELS, GRADE_LEVEL_LABELS, CreateStudentInput, GradeLevel } from '@/types';
import { useState, useEffect } from 'react';
import { Plus, X, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const STUDENT_STATUSES = ['Active', 'Inactive', 'Graduated', 'On Leave'] as const;
const SCHOLARSHIP_STATUSES = ['Active', 'Completed', 'Suspended'] as const;

interface Scholarship {
    id: number;
    scholarshipName: string;
    type: string;
    source: string;
    amount: number;
}

interface SelectedScholarship {
    scholarshipId: number;
    scholarshipName: string;
    awardDate: Date;
    startTerm: string;
    endTerm: string;
    grantAmount: number;
    scholarshipStatus: string;
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
    const [selectedScholarships, setSelectedScholarships] = useState<SelectedScholarship[]>([]);
    const [scholarshipSearch, setScholarshipSearch] = useState('');
    const [scholarshipSourceFilter, setScholarshipSourceFilter] = useState<'all' | 'INTERNAL' | 'EXTERNAL'>('all');
    const [showScholarshipSelector, setShowScholarshipSelector] = useState(false);

    const form = useForm<CreateStudentInput>({
        defaultValues: {
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

    useEffect(() => {
        fetchScholarships();
    }, []);

    const fetchScholarships = async () => {
        setLoadingScholarships(true);
        try {
            const res = await fetch('/api/scholarships?limit=1000&status=Active');
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

    const addScholarship = (scholarship: Scholarship) => {
        const alreadySelected = selectedScholarships.some(s => s.scholarshipId === scholarship.id);
        if (alreadySelected) return;

        const newScholarship: SelectedScholarship = {
            scholarshipId: scholarship.id,
            scholarshipName: scholarship.scholarshipName,
            awardDate: new Date(),
            startTerm: '',
            endTerm: '',
            grantAmount: scholarship.amount,
            scholarshipStatus: 'Active',
        };
        setSelectedScholarships([...selectedScholarships, newScholarship]);
    };

    const removeScholarship = (scholarshipId: number) => {
        setSelectedScholarships(selectedScholarships.filter(s => s.scholarshipId !== scholarshipId));
    };

    const updateScholarship = (scholarshipId: number, field: keyof SelectedScholarship, value: string | number | Date) => {
        setSelectedScholarships(selectedScholarships.map(s => 
            s.scholarshipId === scholarshipId ? { ...s, [field]: value } : s
        ));
    };

    const filteredScholarships = scholarships.filter(scholarship => {
        const matchesSearch = scholarship.scholarshipName.toLowerCase().includes(scholarshipSearch.toLowerCase());
        const matchesSource = scholarshipSourceFilter === 'all' || scholarship.source === scholarshipSourceFilter;
        const notSelected = !selectedScholarships.some(s => s.scholarshipId === scholarship.id);
        return matchesSearch && matchesSource && notSelected;
    });

    const handleFormSubmit = (data: CreateStudentInput) => {
        const submitData = {
            ...data,
            scholarships: selectedScholarships.length > 0 ? selectedScholarships : undefined,
        };
        onSubmit(submitData);
    };

    return (
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
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
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Scholarship Assignment (Optional)</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScholarshipSelector(!showScholarshipSelector)}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Scholarship
                    </Button>
                </div>

                {/* Selected Scholarships */}
                {selectedScholarships.length > 0 && (
                    <div className="space-y-3">
                        {selectedScholarships.map((scholarship) => (
                            <Card key={scholarship.scholarshipId} className="border-2">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-semibold text-sm">{scholarship.scholarshipName}</h4>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => removeScholarship(scholarship.scholarshipId)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Start Term</Label>
                                            <Input
                                                placeholder="1st Semester 2025-2026"
                                                value={scholarship.startTerm}
                                                onChange={(e) => updateScholarship(scholarship.scholarshipId, 'startTerm', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">End Term</Label>
                                            <Input
                                                placeholder="2nd Semester 2025-2026"
                                                value={scholarship.endTerm}
                                                onChange={(e) => updateScholarship(scholarship.scholarshipId, 'endTerm', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Grant Amount</Label>
                                            <Input
                                                type="number"
                                                placeholder="10000"
                                                value={scholarship.grantAmount}
                                                onChange={(e) => updateScholarship(scholarship.scholarshipId, 'grantAmount', parseFloat(e.target.value))}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Status</Label>
                                            <Select 
                                                value={scholarship.scholarshipStatus} 
                                                onValueChange={(value) => updateScholarship(scholarship.scholarshipId, 'scholarshipStatus', value)}
                                            >
                                                <SelectTrigger className="h-8 text-sm">
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
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Scholarship Selector */}
                {showScholarshipSelector && (
                    <Card className="border-2 border-primary/20">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm">Select Scholarship</h4>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowScholarshipSelector(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Search and Filter */}
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search scholarships..."
                                        value={scholarshipSearch}
                                        onChange={(e) => setScholarshipSearch(e.target.value)}
                                        className="pl-10 h-9"
                                    />
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <Select value={scholarshipSourceFilter} onValueChange={(value: 'all' | 'INTERNAL' | 'EXTERNAL') => setScholarshipSourceFilter(value)}>
                                        <SelectTrigger className="h-8 w-[140px] text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="INTERNAL">Internal</SelectItem>
                                            <SelectItem value="EXTERNAL">External</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Scholarship List */}
                            <div className="max-h-[200px] overflow-y-auto space-y-2">
                                {loadingScholarships ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                    </div>
                                ) : filteredScholarships.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        {scholarshipSearch || scholarshipSourceFilter !== 'all' 
                                            ? 'No scholarships match your filters' 
                                            : 'All scholarships have been added'}
                                    </p>
                                ) : (
                                    filteredScholarships.map((scholarship) => (
                                        <button
                                            key={scholarship.id}
                                            type="button"
                                            onClick={() => addScholarship(scholarship)}
                                            className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium text-sm">{scholarship.scholarshipName}</p>
                                                    <p className="text-xs text-muted-foreground">{scholarship.type}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'} className="text-xs">
                                                        {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                                                    </Badge>
                                                    <span className="text-xs font-semibold">₱{scholarship.amount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                >
                    {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Student'}
                </Button>
            </DialogFooter>
        </form>
    );
}
