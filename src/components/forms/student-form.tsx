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
import { Plus, X, Search, Filter, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';

const SCHOLARSHIP_STATUSES = ['Active', 'Completed', 'Suspended'] as const;

const COLLEGE_COURSES = [
    'BS Computer Science',
    'BS Information Technology',
    'BS Business Administration',
    'BS Accountancy',
    'BS Education',
    'BS Nursing',
    'BS Engineering',
    'Other'
] as const;

const COLLEGE_PROGRAMS = [
    'None',
    'Computer Science',
    'Information Systems',
    'Software Engineering',
    'Data Science',
    'Cybersecurity',
    'Other'
] as const;

const SENIOR_HIGH_STRANDS = [
    'STEM',
    'ABM',
    'HUMSS',
    'GAS',
    'TVL',
    'Other'
] as const;

const GRADE_SCHOOL_LEVELS = [
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6'
] as const;

interface Scholarship {
    id: number;
    scholarshipName: string;
    type: string;
    source: string;
    amount: number;
    startDate?: Date | null; // Start date of the scholarship
    endDate?: Date | null;   // End date of the scholarship
    eligibleGradeLevels?: string; // Comma-separated grade levels
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
    const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel | ''>(
        defaultValues?.gradeLevel || ''
    );
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [selectedProgram, setSelectedProgram] = useState<string>('');
    const [selectedStrand, setSelectedStrand] = useState<string>('');
    const [customCourse, setCustomCourse] = useState('');
    const [customProgram, setCustomProgram] = useState('');
    const [customStrand, setCustomStrand] = useState('');
    const [scholarships, setScholarships] = useState<Scholarship[]>([]);
    const [loadingScholarships, setLoadingScholarships] = useState(false);
    const [selectedScholarships, setSelectedScholarships] = useState<SelectedScholarship[]>(
        defaultValues?.scholarships?.map(s => ({
            scholarshipId: s.scholarshipId,
            scholarshipName: scholarships.find(sch => sch.id === s.scholarshipId)?.scholarshipName || '', // Populate with name if available
            awardDate: s.awardDate,
            startTerm: s.startTerm,
            endTerm: s.endTerm,
            grantAmount: s.grantAmount,
            scholarshipStatus: s.scholarshipStatus,
        })) || []
    );
    const [scholarshipSearch, setScholarshipSearch] = useState('');
    const [scholarshipSourceFilter, setScholarshipSourceFilter] = useState<'all' | 'INTERNAL' | 'EXTERNAL'>('all');
    const [showScholarshipSelector, setShowScholarshipSelector] = useState(false);

    const form = useForm<CreateStudentInput>({
        defaultValues: {
            lastName: '',
            firstName: '',
            middleInitial: '',
            program: '',
            gradeLevel: '' as GradeLevel,
            yearLevel: '',
            status: 'Active',
            birthDate: undefined,
            ...defaultValues,
        },
    });
    
    // Function to calculate age from birth date
    const calculateAge = (birthDate: Date | null | undefined): number => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    };

    useEffect(() => {
        fetchScholarships();
    }, []);

    useEffect(() => {
        // Populate scholarship names for existing scholarships when editing
        if (scholarships.length > 0) {
            setSelectedScholarships(prev => prev.map(selected => {
                const scholarship = scholarships.find(s => s.id === selected.scholarshipId);
                if (scholarship && selected.scholarshipName !== scholarship.scholarshipName) {
                    return {
                        ...selected,
                        scholarshipName: scholarship.scholarshipName,
                    };
                }
                return selected;
            }));
        }
    }, [scholarships]);

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
        form.setValue('yearLevel', '');
        form.setValue('program', '');
        setSelectedCourse('');
        setSelectedProgram('');
        setSelectedStrand('');
        setCustomCourse('');
        setCustomProgram('');
        setCustomStrand('');
    };

    const addScholarship = (scholarship: Scholarship) => {
        const alreadySelected = selectedScholarships.some(s => s.scholarshipId === scholarship.id);
        if (alreadySelected) return;

        // Format dates for startTerm and endTerm if available
        let startTerm = '';
        let endTerm = '';
        
        if (scholarship.startDate || scholarship.endDate) {
            const startDate = scholarship.startDate ? new Date(scholarship.startDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }) : 'TBD';
            
            const endDate = scholarship.endDate ? new Date(scholarship.endDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }) : 'TBD';
            
            startTerm = startDate;
            endTerm = endDate;
        }

        // If no scholarship-level dates are set, calculate based on student's grade level
        if (!startTerm && !endTerm && selectedGradeLevel) {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth(); // 0-11
            
            // Determine academic year based on current date (assuming academic year starts in June)
            const academicYearStart = currentMonth >= 5 ? currentYear : currentYear - 1; // June = 5 in 0-indexed
            const academicYearEnd = academicYearStart + 1;
            
            // Calculate end year based on grade level
            let endYear = academicYearEnd;
            
            if (selectedGradeLevel === 'GRADE_SCHOOL') {
                // Grade school: assume until they complete grade school (Grade 6)
                if (form.getValues('yearLevel')) {
                    const yearLevelValue = form.getValues('yearLevel');
                    const gradeNumber = parseInt(yearLevelValue.split(' ')[1] || '6'); // Extract grade number
                    endYear = academicYearEnd + (6 - gradeNumber); // Grade 6 is the last grade
                } else {
                    endYear = academicYearEnd + 5; // Default to 6 years from now if grade level is unknown
                }
            } else if (selectedGradeLevel === 'JUNIOR_HIGH') {
                // Junior high: assume until they complete senior high (Grade 10 to Grade 12)
                if (form.getValues('yearLevel')) {
                    const yearLevelValue = form.getValues('yearLevel');
                    const yearMatch = yearLevelValue.match(/Grade (\d+)/);
                    if (yearMatch) {
                        const currentGrade = parseInt(yearMatch[1]);
                        endYear = academicYearEnd + (10 - currentGrade); // Grade 10 is the last for JHS
                    } else {
                        endYear = academicYearEnd + 4; // Default to 4 years for JHS
                    }
                } else {
                    endYear = academicYearEnd + 4; // Default to 4 years for JHS
                }
            } else if (selectedGradeLevel === 'SENIOR_HIGH') {
                // Senior high: assume until they complete SHS (Grade 11-12)
                if (form.getValues('yearLevel')) {
                    const yearLevelValue = form.getValues('yearLevel');
                    const yearMatch = yearLevelValue.match(/Grade (\d+)/);
                    if (yearMatch) {
                        const currentGrade = parseInt(yearMatch[1]);
                        endYear = academicYearEnd + (12 - currentGrade); // Grade 12 is the last
                    } else {
                        endYear = academicYearEnd + 2; // Default to 2 years for SHS
                    }
                } else {
                    endYear = academicYearEnd + 2; // Default to 2 years for SHS
                }
            } else if (selectedGradeLevel === 'COLLEGE') {
                // College: assume 4-5 years depending on program
                if (form.getValues('yearLevel')) {
                    const yearLevelValue = form.getValues('yearLevel');
                    const yearMatch = yearLevelValue.match(/(\d+)(st|nd|rd|th) Year/);
                    if (yearMatch) {
                        const currentYearNum = parseInt(yearMatch[1]);
                        const totalYears = 4; // Most programs are 4 years
                        endYear = academicYearEnd + (totalYears - currentYearNum);
                    } else {
                        endYear = academicYearEnd + 4; // Default to 4 years for college
                    }
                } else {
                    endYear = academicYearEnd + 4; // Default to 4 years for college
                }
            }
            
            // Format as academic year terms
            startTerm = `1st Semester ${academicYearStart}-${academicYearEnd}`;
            endTerm = `2nd Semester ${endYear}-${endYear + 1}`;
        }

        const newScholarship: SelectedScholarship = {
            scholarshipId: scholarship.id,
            scholarshipName: scholarship.scholarshipName,
            awardDate: new Date(),
            startTerm: startTerm,
            endTerm: endTerm,
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

        // Filter by student's grade level
        const eligibleLevels = scholarship.eligibleGradeLevels ? scholarship.eligibleGradeLevels.split(',').map(l => l.trim()) : [];
        const matchesGradeLevel = eligibleLevels.length === 0 || eligibleLevels.includes(selectedGradeLevel as string);

        return matchesSearch && matchesSource && notSelected && matchesGradeLevel;
    });

    // Get selected scholarship details for display
    const getSelectedScholarshipDetails = (scholarshipId: number) => {
        return scholarships.find(s => s.id === scholarshipId);
    };

    const handleFormSubmit = (data: CreateStudentInput) => {
        const submitData = {
            ...data,
            scholarships: selectedScholarships.length > 0 ? selectedScholarships : undefined,
        };
        onSubmit(submitData);
    };

    return (
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 py-2">
            <div className="grid grid-cols-3 gap-6">
                <div className="space-y-3 col-span-1">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                    <Input
                        id="lastName"
                        {...form.register('lastName', { required: true })}
                        placeholder="DELA CRUZ"
                        className="h-10"
                        onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase();
                            form.setValue('lastName', e.target.value);
                        }}
                    />
                </div>
                <div className="space-y-3 col-span-1">
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                    <Input
                        id="firstName"
                        {...form.register('firstName', { required: true })}
                        placeholder="JUAN"
                        className="h-10"
                        onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase();
                            form.setValue('firstName', e.target.value);
                        }}
                    />
                </div>
                <div className="space-y-3 col-span-1">
                    <Label htmlFor="middleInitial" className="text-sm font-medium">M.I.</Label>
                    <Input
                        id="middleInitial"
                        {...form.register('middleInitial')}
                        placeholder="S"
                        maxLength={1}
                        className="h-10"
                        onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase();
                            form.setValue('middleInitial', e.target.value);
                        }}
                    />
                </div>
            </div>

            <div className="space-y-3">
                <Label htmlFor="gradeLevel" className="text-sm font-medium">Grade Level</Label>
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
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select grade level" />
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

            {/* College Fields */}
            {selectedGradeLevel === 'COLLEGE' && (
                <>
                    <div className="space-y-3">
                        <Label htmlFor="course" className="text-sm font-medium">Course</Label>
                        <Select 
                            value={selectedCourse} 
                            onValueChange={(value) => {
                                setSelectedCourse(value);
                                if (value !== 'Other') {
                                    form.setValue('program', value);
                                    setCustomCourse('');
                                }
                            }}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select a course" />
                            </SelectTrigger>
                            <SelectContent>
                                {COLLEGE_COURSES.map((course) => (
                                    <SelectItem key={course} value={course}>
                                        {course}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedCourse === 'Other' && (
                        <div className="space-y-3">
                            <Label htmlFor="customCourse" className="text-sm font-medium">Enter Course Name</Label>
                            <Input
                                id="customCourse"
                                value={customCourse}
                                onChange={(e) => {
                                    setCustomCourse(e.target.value);
                                    form.setValue('program', e.target.value);
                                }}
                                placeholder="Enter course name"
                                className="h-10"
                            />
                        </div>
                    )}

                    {selectedCourse && (
                        <div className="space-y-3">
                            <Label htmlFor="program" className="text-sm font-medium">Major (Optional)</Label>
                            <Select 
                                value={selectedProgram} 
                                onValueChange={(value) => {
                                    setSelectedProgram(value);
                                    if (value === 'None') {
                                        const courseValue = selectedCourse === 'Other' ? customCourse : selectedCourse;
                                        form.setValue('program', courseValue);
                                        setCustomProgram('');
                                    } else if (value !== 'Other') {
                                        const courseValue = selectedCourse === 'Other' ? customCourse : selectedCourse;
                                        form.setValue('program', `${courseValue} - ${value}`);
                                        setCustomProgram('');
                                    }
                                }}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select a major" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COLLEGE_PROGRAMS.map((program) => (
                                        <SelectItem key={program} value={program}>
                                            {program}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {selectedProgram === 'Other' && (
                        <div className="space-y-3">
                            <Label htmlFor="customProgram" className="text-sm font-medium">Enter Major Name</Label>
                            <Input
                                id="customProgram"
                                value={customProgram}
                                onChange={(e) => {
                                    setCustomProgram(e.target.value);
                                    const courseValue = selectedCourse === 'Other' ? customCourse : selectedCourse;
                                    form.setValue('program', `${courseValue} - ${e.target.value}`);
                                }}
                                placeholder="Enter major name"
                                className="h-10"
                            />
                        </div>
                    )}

            <div className="space-y-3">
                <Label htmlFor="yearLevel" className="text-sm font-medium">Year Level</Label>
                <Controller
                    name="yearLevel"
                    control={form.control}
                    render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select year level" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEAR_LEVELS.COLLEGE.map((level) => (
                                    <SelectItem key={level} value={level}>
                                        {level}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
            
            <div className="space-y-3">
                <Label htmlFor="birthDate" className="text-sm font-medium">Birth Date</Label>
                <Input
                    id="birthDate"
                    type="date"
                    value={defaultValues?.birthDate ? new Date(defaultValues.birthDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                        const dateValue = e.target.value ? new Date(e.target.value) : null;
                        form.setValue('birthDate', dateValue);
                    }}
                    className="h-10"
                />
            </div>
        </>
    )}

            {/* Senior High Fields */}
            {selectedGradeLevel === 'SENIOR_HIGH' && (
                <>
                    <div className="space-y-3">
                        <Label htmlFor="strand" className="text-sm font-medium">Strand</Label>
                        <Select 
                            value={selectedStrand} 
                            onValueChange={(value) => {
                                setSelectedStrand(value);
                                if (value !== 'Other') {
                                    form.setValue('program', value);
                                    setCustomStrand('');
                                }
                            }}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select a strand" />
                            </SelectTrigger>
                            <SelectContent>
                                {SENIOR_HIGH_STRANDS.map((strand) => (
                                    <SelectItem key={strand} value={strand}>
                                        {strand}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedStrand === 'Other' && (
                        <div className="space-y-3">
                            <Label htmlFor="customStrand" className="text-sm font-medium">Enter Strand Name</Label>
                            <Input
                                id="customStrand"
                                value={customStrand}
                                onChange={(e) => {
                                    setCustomStrand(e.target.value);
                                    form.setValue('program', e.target.value);
                                }}
                                placeholder="Enter strand name"
                                className="h-10"
                            />
                        </div>
                    )}

                    <div className="space-y-3">
                        <Label htmlFor="specialization" className="text-sm font-medium">Specialization (Optional)</Label>
                        <Input
                            id="specialization"
                            placeholder="Enter specialization"
                            className="h-10"
                            onChange={(e) => {
                                const strandValue = selectedStrand === 'Other' ? customStrand : selectedStrand;
                                const programValue = e.target.value ? `${strandValue} - ${e.target.value}` : strandValue;
                                form.setValue('program', programValue);
                            }}
                        />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="yearLevel" className="text-sm font-medium">Year Level</Label>
                        <Controller
                            name="yearLevel"
                            control={form.control}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select year level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {YEAR_LEVELS.SENIOR_HIGH.map((level) => (
                                            <SelectItem key={level} value={level}>
                                                {level}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </>
            )}

            {/* Grade School Fields */}
            {selectedGradeLevel === 'GRADE_SCHOOL' && (
                <div className="space-y-3">
                    <Label htmlFor="yearLevel" className="text-sm font-medium">Select Grade</Label>
                    <Controller
                        name="yearLevel"
                        control={form.control}
                        render={({ field }) => (
                            <Select 
                                value={field.value} 
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue('program', value);
                                }}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select grade level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {GRADE_SCHOOL_LEVELS.map((level) => (
                                        <SelectItem key={level} value={level}>
                                            {level}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            )}

            {/* Junior High Fields */}
            {selectedGradeLevel === 'JUNIOR_HIGH' && (
                <div className="space-y-3">
                    <Label htmlFor="yearLevel" className="text-sm font-medium">Year Level</Label>
                    <Controller
                        name="yearLevel"
                        control={form.control}
                        render={({ field }) => (
                            <Select 
                                value={field.value} 
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue('program', value);
                                }}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select year level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {YEAR_LEVELS.JUNIOR_HIGH.map((level) => (
                                        <SelectItem key={level} value={level}>
                                            {level}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            )}

            {/* Birth Date Field - appears for all grade levels */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label htmlFor="birthDate" className="text-sm font-medium">Birth Date</Label>
                    {form.watch('birthDate') && (
                        <span className="text-xs text-muted-foreground">
                            Age: {calculateAge(form.watch('birthDate'))}
                        </span>
                    )}
                </div>
                <div className="relative">
                    <Input
                        id="birthDate"
                        type="date"
                        value={defaultValues?.birthDate ? new Date(defaultValues.birthDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                            const dateValue = e.target.value ? new Date(e.target.value) : null;
                            form.setValue('birthDate', dateValue);
                        }}
                        className="h-10 pl-8"
                    />
                    <Calendar className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
            </div>

            {/* Scholarship Assignment Section */}
            <div className="border-t pt-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Scholarship Assignment</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScholarshipSelector(!showScholarshipSelector)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Scholarship
                    </Button>
                </div>

                {/* Selected Scholarships */}
                {selectedScholarships.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">Assigned Scholarships</h4>
                        <div className="grid grid-cols-1 gap-4">
                            {selectedScholarships.map((scholarship) => {
                                const scholarshipDetails = getSelectedScholarshipDetails(scholarship.scholarshipId);
                                const source = scholarshipDetails?.source || (scholarship.scholarshipName.includes('CHED') ? 'EXTERNAL' : 'INTERNAL');
                                const type = scholarshipDetails?.type || scholarship.scholarshipName;
                                
                                return (
                                <Card key={scholarship.scholarshipId} className="border-2 p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-base">{scholarship.scholarshipName}</h4>
                                            <p className="text-xs text-muted-foreground">{type}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => removeScholarship(scholarship.scholarshipId)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Start Term</Label>
                                            <Input
                                                placeholder="1st Semester 2025-2026"
                                                value={scholarship.startTerm}
                                                onChange={(e) => updateScholarship(scholarship.scholarshipId, 'startTerm', e.target.value)}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">End Term</Label>
                                            <Input
                                                placeholder="2nd Semester 2025-2026"
                                                value={scholarship.endTerm}
                                                onChange={(e) => updateScholarship(scholarship.scholarshipId, 'endTerm', e.target.value)}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Grant Amount</Label>
                                            <Input
                                                type="number"
                                                placeholder="10000"
                                                value={scholarship.grantAmount}
                                                onChange={(e) => updateScholarship(scholarship.scholarshipId, 'grantAmount', parseFloat(e.target.value))}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Status</Label>
                                            <Select
                                                value={scholarship.scholarshipStatus}
                                                onValueChange={(value) => updateScholarship(scholarship.scholarshipId, 'scholarshipStatus', value)}
                                            >
                                                <SelectTrigger className="h-9 text-sm">
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
                                    
                                    <div className="mt-3 flex items-center gap-2">
                                        <Badge variant={source === 'INTERNAL' ? 'default' : 'secondary'} className="text-xs">
                                            {source === 'INTERNAL' ? 'Internal' : 'External'}
                                        </Badge>
                                    </div>
                                </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Scholarship Selector */}
                {showScholarshipSelector && (
                    <Card className="border-2 border-primary/20 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-lg">Add New Scholarship</h4>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setShowScholarshipSelector(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Search and Filter */}
                        <div className="mb-4">
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search scholarships..."
                                    value={scholarshipSearch}
                                    onChange={(e) => setScholarshipSearch(e.target.value)}
                                    className="pl-10 h-10"
                                />
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Filter by:</span>
                                </div>
                                <Select value={scholarshipSourceFilter} onValueChange={(value: 'all' | 'INTERNAL' | 'EXTERNAL') => setScholarshipSourceFilter(value)}>
                                    <SelectTrigger className="h-9 text-sm w-[160px]">
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
                                <div className="max-h-60 overflow-y-auto space-y-3">
                                    {loadingScholarships ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                        </div>
                                    ) : filteredScholarships.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-6">
                                            {scholarshipSearch || scholarshipSourceFilter !== 'all' 
                                                ? 'No scholarships match your filters' 
                                                : 'All scholarships have been added'}
                                        </p>
                                    ) : (
                                        filteredScholarships.map((scholarship) => {
                                            // Format duration for display
                                            let durationDisplay = '';
                                            if (scholarship.startDate || scholarship.endDate) {
                                                const startStr = scholarship.startDate 
                                                    ? new Date(scholarship.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                                    : 'No start';
                                                const endStr = scholarship.endDate 
                                                    ? new Date(scholarship.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                                    : 'No end';
                                                durationDisplay = `${startStr} - ${endStr}`;
                                            } else {
                                                durationDisplay = 'Duration not set';
                                            }

                                            return (
                                                <div
                                                    key={scholarship.id}
                                                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="font-medium text-base">{scholarship.scholarshipName}</p>
                                                        <p className="text-sm text-muted-foreground">{scholarship.type}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {durationDisplay}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <Badge variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'} className="text-sm">
                                                                {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                                                            </Badge>
                                                            <p className="text-sm font-semibold mt-1">₱{scholarship.amount.toLocaleString()}</p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => addScholarship(scholarship)}
                                                        >
                                                            Add
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                    </Card>
                )}
            </div>

            <DialogFooter className="gap-3 pt-4">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel}
                    className="h-10 px-4 py-2"
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-10 px-6 py-2"
                >
                    {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Student'}
                </Button>
            </DialogFooter>
        </form>
    );
}
