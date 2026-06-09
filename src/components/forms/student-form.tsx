'use client';

import { useEffect, useState } from 'react';

import { CalendarPlus, Filter, Info, Pencil, Plus, Search, X } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';

import {
  COMPACT_DIALOG_CONTENT_CLASS,
  DIALOG_BODY_CLASS,
  DIALOG_FOOTER_CLASS,
  DIALOG_FORM_CLASS,
  DIALOG_HEADER_CLASS,
} from '@/components/shared/dialog-layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useAcademicYears,
  useActiveAcademicYear,
  useCreateAcademicYear,
  useUpdateAcademicYear,
} from '@/hooks/use-queries';
import {
  getUnavailableAcademicYearIdsForScholarship,
  hasScholarshipSelectionForAcademicYear,
} from '@/lib/student-scholarship-year-options';
import { getCoveredTermsLabel } from '@/lib/terms';
import { isScholarshipEligibleForStudent } from '@/lib/validations';
import {
  AcademicYear,
  AcademicYearInput,
  CreateStudentInput,
  GRADE_LEVELS,
  GRADE_LEVEL_LABELS,
  GradeLevel,
  GrantType,
  SCHOLARSHIP_TERMS,
  SCHOLARSHIP_TERM_LABELS,
  TERM_FORMATS,
  TERM_TYPES,
  TERM_TYPE_LABELS,
  TermType,
  YEAR_LEVELS,
} from '@/types';

const SCHOLARSHIP_STATUSES = ['Active', 'Completed', 'Suspended'] as const;

const COLLEGE_COURSES = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Business Administration',
  'BS Accountancy',
  'BS Education',
  'BS Nursing',
  'BS Engineering',
  'Other',
] as const;

const COLLEGE_PROGRAMS = [
  'None',
  'Computer Science',
  'Information Systems',
  'Software Engineering',
  'Data Science',
  'Cybersecurity',
  'Other',
] as const;

const GRADE_SCHOOL_LEVELS = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
] as const;

const SCHOLARSHIP_SOURCE_ORDER: Record<string, number> = {
  INTERNAL: 0,
  EXTERNAL: 1,
};

function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function getDefaultAcademicYearInput(): AcademicYearInput {
  const now = new Date();
  const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;

  return {
    year: `${startYear}-${startYear + 1}`,
    startDate: `${startYear}-06-01`,
    endDate: `${startYear + 1}-05-31`,
    semester: '1ST',
    isActive: false,
    promotionDate: '',
  };
}

function getAcademicYearStartYear(year: string | null | undefined) {
  if (!year) return null;

  const match = year.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (!match) return null;

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);

  return endYear === startYear + 1 ? startYear : null;
}

function getAcademicYearInputFromStartYear(
  startYear: number,
  current: AcademicYearInput
): AcademicYearInput {
  return {
    ...current,
    year: `${startYear}-${startYear + 1}`,
    startDate: `${startYear}-06-01`,
    endDate: `${startYear + 1}-05-31`,
  };
}

interface ScholarshipFormData {
  id: number;
  scholarshipName: string;
  type: string;
  source: string;
  amount: number;
  eligibleGradeLevels?: string; // Comma-separated grade levels
  eligiblePrograms?: string | null; // Comma-separated programs
  grantType: string;
  coversTuition: boolean;
  coversMiscellaneous: boolean;
  coversLaboratory: boolean;
  coveredTerms: string;
}

interface SelectedScholarship {
  id?: number;
  clientKey: string;
  scholarshipId: number;
  scholarshipName: string;
  academicYearId?: number | null;
  awardDate: Date;
  startTerm: string;
  endTerm: string;
  grantAmount: number;
  grantType: GrantType;
  scholarshipStatus: string;
}

interface StudentFormProps {
  defaultValues?: Partial<CreateStudentInput>;
  onSubmit: (data: CreateStudentInput) => void;
  onCancel: () => void;
  isEditing?: boolean;
  loading?: boolean;
  canEditFees?: boolean;
  canManageAcademicYears?: boolean;
  studentName?: string; // Name of student being edited for confirmation display
}

export function StudentForm({
  defaultValues,
  onSubmit,
  onCancel,
  isEditing = false,
  loading = false,
  canEditFees = true,
  canManageAcademicYears = false,
  studentName,
}: StudentFormProps) {
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel | ''>(
    defaultValues?.gradeLevel || ''
  );
  const [selectedTermType, setSelectedTermType] = useState<TermType>(
    defaultValues?.termType || 'SEMESTER'
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingData, setPendingData] = useState<CreateStudentInput | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [customCourse, setCustomCourse] = useState('');
  const [customProgram, setCustomProgram] = useState('');
  const [scholarships, setScholarships] = useState<ScholarshipFormData[]>([]);
  const [loadingScholarships, setLoadingScholarships] = useState(false);
  const [selectedScholarships, setSelectedScholarships] = useState<SelectedScholarship[]>(
    defaultValues?.scholarships?.map((s, index) => ({
      id: s.id,
      clientKey: s.id ? `existing-${s.id}` : `initial-${s.scholarshipId}-${index}`,
      scholarshipId: s.scholarshipId,
      scholarshipName:
        scholarships.find((sch) => sch.id === s.scholarshipId)?.scholarshipName || '', // Populate with name if available
      academicYearId: s.academicYearId ?? null,
      awardDate: s.awardDate,
      startTerm: s.startTerm,
      endTerm: s.endTerm,
      grantAmount: s.grantAmount,
      grantType: s.grantType || 'FULL',
      scholarshipStatus: s.scholarshipStatus,
    })) || []
  );
  const [scholarshipSearch, setScholarshipSearch] = useState('');
  const [scholarshipSourceFilter, setScholarshipSourceFilter] = useState<
    'all' | 'INTERNAL' | 'EXTERNAL'
  >('all');
  const [showScholarshipSelector, setShowScholarshipSelector] = useState(false);
  const { data: academicYearsData } = useAcademicYears();
  const { data: activeAcademicYearData } = useActiveAcademicYear();
  const createAcademicYearMutation = useCreateAcademicYear();
  const updateAcademicYearMutation = useUpdateAcademicYear();
  const academicYears = ((academicYearsData?.data || []) as AcademicYear[]).slice().sort((a, b) => {
    const left = new Date(a.startDate).getTime();
    const right = new Date(b.startDate).getTime();
    return right - left;
  });
  const activeAcademicYear = (activeAcademicYearData?.data || null) as AcademicYear | null;
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [editingAcademicYear, setEditingAcademicYear] = useState<AcademicYear | null>(null);
  const [activeYearAssignmentKey, setActiveYearAssignmentKey] = useState<string | null>(null);
  const [academicYearFormData, setAcademicYearFormData] = useState<AcademicYearInput>(() =>
    getDefaultAcademicYearInput()
  );
  const [academicYearStartYearInput, setAcademicYearStartYearInput] = useState(() =>
    String(getAcademicYearStartYear(getDefaultAcademicYearInput().year) || '')
  );
  const [academicYearSubmitting, setAcademicYearSubmitting] = useState(false);

  // Fee state management (manual input only)
  const [fees, setFees] = useState({
    tuitionFee: 0,
    otherFee: 0,
    miscellaneousFee: 0,
    laboratoryFee: 0,
  });

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
      termType: 'SEMESTER',
      ...defaultValues,
    },
  });
  const currentGradeLevel = form.watch('gradeLevel') || selectedGradeLevel;
  const currentProgram = form.watch('program') || '';
  const defaultAssignmentAcademicYearId = activeAcademicYear?.id ?? null;
  const selectedAcademicYearStartYear = getAcademicYearStartYear(academicYearFormData.year);
  const hasValidAcademicYearStartYear =
    !!selectedAcademicYearStartYear &&
    academicYearStartYearInput === String(selectedAcademicYearStartYear);

  // Fetch scholarships on component mount
  useEffect(() => {
    fetchScholarships();
  }, []);

  useEffect(() => {
    // Populate scholarship names for existing scholarships when editing
    if (scholarships.length > 0) {
      setSelectedScholarships((prev) =>
        prev.map((selected) => {
          const scholarship = scholarships.find((s) => s.id === selected.scholarshipId);
          if (scholarship && selected.scholarshipName !== scholarship.scholarshipName) {
            return {
              ...selected,
              scholarshipName: scholarship.scholarshipName,
            };
          }
          return selected;
        })
      );
    }
  }, [scholarships]);

  useEffect(() => {
    if (!currentGradeLevel || scholarships.length === 0) {
      return;
    }

    setSelectedScholarships((prev) => {
      const eligibleScholarships = prev.filter((selected) => {
        const scholarship = scholarships.find((s) => s.id === selected.scholarshipId);

        return (
          !scholarship ||
          isScholarshipEligibleForStudent(
            { gradeLevel: currentGradeLevel, program: currentProgram },
            scholarship
          )
        );
      });

      return eligibleScholarships.length === prev.length ? prev : eligibleScholarships;
    });
  }, [currentGradeLevel, currentProgram, scholarships]);

  useEffect(() => {
    // Populate fees from defaultValues when editing - only run once when editing mode changes
    // We don't want this to re-run when defaultValues changes during typing
    if (isEditing && defaultValues?.fees) {
      const fee = defaultValues.fees;
      setFees((prevFees) => {
        // Only update if the values are different to avoid unnecessary re-renders
        const newFees = {
          tuitionFee: Number(fee.tuitionFee) || 0,
          otherFee: Number(fee.otherFee) || 0,
          miscellaneousFee: Number(fee.miscellaneousFee) || 0,
          laboratoryFee: Number(fee.laboratoryFee) || 0,
        };
        // Check if values are actually different
        if (
          prevFees.tuitionFee !== newFees.tuitionFee ||
          prevFees.otherFee !== newFees.otherFee ||
          prevFees.miscellaneousFee !== newFees.miscellaneousFee ||
          prevFees.laboratoryFee !== newFees.laboratoryFee
        ) {
          return newFees;
        }
        return prevFees;
      });
    } else if (!isEditing) {
      // Reset fees when not editing (adding new student)
      setFees({
        tuitionFee: 0,
        otherFee: 0,
        miscellaneousFee: 0,
        laboratoryFee: 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const fetchScholarships = async () => {
    setLoadingScholarships(true);
    try {
      const res = await fetch('/api/scholarships?limit=1000&status=Active');
      const data = await res.json();
      if (data.success) {
        setScholarships(data.data);
      }
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      console.error('Error fetching scholarships:', error);
    } finally {
      setLoadingScholarships(false);
    }
  };

  const handleAcademicYearChange = (clientKey: string, value: string) => {
    const academicYearId = Number(value);
    const selectedAcademicYearId =
      Number.isInteger(academicYearId) && academicYearId > 0 ? academicYearId : null;
    const assignment = selectedScholarships.find(
      (scholarship) => scholarship.clientKey === clientKey
    );

    if (assignment && selectedAcademicYearId !== null) {
      const unavailableAcademicYearIds = getUnavailableAcademicYearIdsForScholarship(
        selectedScholarships,
        clientKey,
        assignment.scholarshipId,
        defaultAssignmentAcademicYearId
      );

      if (unavailableAcademicYearIds.has(selectedAcademicYearId)) {
        return;
      }
    }

    updateScholarship(clientKey, 'academicYearId', selectedAcademicYearId);
  };

  const openCreateAcademicYearDialog = (clientKey: string) => {
    const defaultInput = getDefaultAcademicYearInput();

    setActiveYearAssignmentKey(clientKey);
    setEditingAcademicYear(null);
    setAcademicYearFormData(defaultInput);
    setAcademicYearStartYearInput(String(getAcademicYearStartYear(defaultInput.year) || ''));
    setYearDialogOpen(true);
  };

  const openEditAcademicYearDialog = (clientKey: string) => {
    const assignment = selectedScholarships.find(
      (scholarship) => scholarship.clientKey === clientKey
    );
    const academicYear =
      academicYears.find((year) => year.id === (assignment?.academicYearId ?? null)) || null;

    if (!academicYear) return;

    setActiveYearAssignmentKey(clientKey);
    setEditingAcademicYear(academicYear);
    setAcademicYearStartYearInput(String(getAcademicYearStartYear(academicYear.year) || ''));
    setAcademicYearFormData({
      year: academicYear.year,
      startDate: toDateInputValue(academicYear.startDate),
      endDate: toDateInputValue(academicYear.endDate),
      semester: academicYear.semester,
      isActive: academicYear.isActive,
      promotionDate: toDateInputValue(academicYear.promotionDate),
    });
    setYearDialogOpen(true);
  };

  const handleAcademicYearFormChange = (
    field: keyof AcademicYearInput,
    value: string | boolean
  ) => {
    setAcademicYearFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAcademicYearStartYearChange = (value: string) => {
    setAcademicYearStartYearInput(value);

    if (!/^\d{4}$/.test(value)) return;

    const startYear = Number(value);

    if (startYear < 1900 || startYear > 2200) return;

    setAcademicYearFormData((current) => getAcademicYearInputFromStartYear(startYear, current));
  };

  const handleAcademicYearStartYearBlur = () => {
    if (!selectedAcademicYearStartYear) return;

    setAcademicYearStartYearInput(String(selectedAcademicYearStartYear));
  };

  const handleAcademicYearSubmit = async () => {
    if (!activeYearAssignmentKey) return;

    setAcademicYearSubmitting(true);
    try {
      const payload: AcademicYearInput = {
        ...academicYearFormData,
        promotionDate: academicYearFormData.promotionDate || null,
      };
      const response = editingAcademicYear
        ? await updateAcademicYearMutation.mutateAsync({
            id: editingAcademicYear.id,
            data: payload,
          })
        : await createAcademicYearMutation.mutateAsync(payload);
      const savedAcademicYear = response.data;

      if (savedAcademicYear?.id) {
        updateScholarship(activeYearAssignmentKey, 'academicYearId', savedAcademicYear.id);
      }
      setYearDialogOpen(false);
      setEditingAcademicYear(null);
      setActiveYearAssignmentKey(null);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      // Mutation hooks already surface the error toast.
    } finally {
      setAcademicYearSubmitting(false);
    }
  };

  const handleGradeLevelChange = (value: GradeLevel) => {
    setSelectedGradeLevel(value);
    form.setValue('gradeLevel', value);
    form.setValue('yearLevel', '');
    form.setValue('program', '');
    setSelectedCourse('');
    setSelectedProgram('');
    setCustomCourse('');
    setCustomProgram('');
  };

  const addScholarship = (scholarship: ScholarshipFormData) => {
    const alreadySelected = hasScholarshipSelectionForAcademicYear(
      selectedScholarships,
      scholarship.id,
      defaultAssignmentAcademicYearId,
      defaultAssignmentAcademicYearId
    );
    if (alreadySelected) return;
    if (
      !isScholarshipEligibleForStudent(
        { gradeLevel: currentGradeLevel, program: currentProgram },
        scholarship
      )
    ) {
      return;
    }

    // Calculate startTerm and endTerm based on student's grade level and term type
    let startTerm = '';
    let endTerm = '';

    // Calculate based on student's grade level
    if (currentGradeLevel) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // 0-11

      // Determine academic year based on current date (assuming academic year starts in June)
      const academicYearStart = currentMonth >= 5 ? currentYear : currentYear - 1; // June = 5 in 0-indexed
      const academicYearEnd = academicYearStart + 1;

      // Get term format based on selected term type
      const termFormat = TERM_FORMATS[selectedTermType];

      // Calculate end year based on grade level
      let endYear = academicYearEnd;

      if (currentGradeLevel === 'GRADE_SCHOOL') {
        // Grade school: assume until they complete grade school (Grade 6)
        if (form.getValues('yearLevel')) {
          const yearLevelValue = form.getValues('yearLevel');
          const gradeNumber = parseInt(yearLevelValue.split(' ')[1] || '6'); // Extract grade number
          endYear = academicYearEnd + (6 - gradeNumber); // Grade 6 is the last grade
        } else {
          endYear = academicYearEnd + 5; // Default to 6 years from now if grade level is unknown
        }
      } else if (currentGradeLevel === 'JUNIOR_HIGH') {
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
      } else if (currentGradeLevel === 'SENIOR_HIGH') {
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
      } else if (currentGradeLevel === 'COLLEGE') {
        // College: assume 4-5 years for semester, 3-4 years for trimester
        if (form.getValues('yearLevel')) {
          const yearLevelValue = form.getValues('yearLevel');
          const yearMatch = yearLevelValue.match(/(\d+)(st|nd|rd|th) Year/);
          if (yearMatch) {
            const currentYearNum = parseInt(yearMatch[1]);
            const totalYears = selectedTermType === 'TRIMESTER' ? 3 : 4; // 3 years for trimester, 4 for semester
            endYear = academicYearEnd + (totalYears - currentYearNum);
          } else {
            endYear = academicYearEnd + (selectedTermType === 'TRIMESTER' ? 3 : 4);
          }
        } else {
          endYear = academicYearEnd + (selectedTermType === 'TRIMESTER' ? 3 : 4);
        }
      }

      // Format as academic year terms using term format
      startTerm = `${termFormat.labels[0]} ${termFormat.prefix} ${academicYearStart}-${academicYearEnd}`;
      endTerm = `${termFormat.labels[termFormat.labels.length - 1]} ${termFormat.prefix} ${endYear}-${endYear + 1}`;
    }

    const newScholarship: SelectedScholarship = {
      clientKey: `new-${scholarship.id}-${Date.now()}`,
      scholarshipId: scholarship.id,
      scholarshipName: scholarship.scholarshipName,
      academicYearId: defaultAssignmentAcademicYearId,
      awardDate: new Date(),
      startTerm: startTerm,
      endTerm: endTerm,
      grantAmount:
        scholarship.grantType === 'TUITION_ONLY' || scholarship.grantType === 'NONE'
          ? 0
          : scholarship.amount,
      grantType: scholarship.grantType as GrantType,
      scholarshipStatus: 'Active',
    };
    setSelectedScholarships([...selectedScholarships, newScholarship]);
  };

  const removeScholarship = (clientKey: string) => {
    setSelectedScholarships(selectedScholarships.filter((s) => s.clientKey !== clientKey));
  };

  const updateScholarship = (
    clientKey: string,
    field: keyof SelectedScholarship,
    value: string | number | Date | null
  ) => {
    setSelectedScholarships(
      selectedScholarships.map((s) => (s.clientKey === clientKey ? { ...s, [field]: value } : s))
    );
  };

  const filteredScholarships = scholarships
    .filter((scholarship) => {
      const matchesSearch = scholarship.scholarshipName
        .toLowerCase()
        .includes(scholarshipSearch.toLowerCase());
      const matchesSource =
        scholarshipSourceFilter === 'all' || scholarship.source === scholarshipSourceFilter;
      const notSelected = !hasScholarshipSelectionForAcademicYear(
        selectedScholarships,
        scholarship.id,
        defaultAssignmentAcademicYearId,
        defaultAssignmentAcademicYearId
      );

      const matchesStudentEligibility = isScholarshipEligibleForStudent(
        { gradeLevel: currentGradeLevel, program: currentProgram },
        scholarship
      );

      return matchesSearch && matchesSource && notSelected && matchesStudentEligibility;
    })
    .sort((a, b) => {
      const sourceOrder =
        (SCHOLARSHIP_SOURCE_ORDER[a.source] ?? 99) - (SCHOLARSHIP_SOURCE_ORDER[b.source] ?? 99);
      return sourceOrder || a.scholarshipName.localeCompare(b.scholarshipName);
    });

  // Get selected scholarship details for display
  const getSelectedScholarshipDetails = (scholarshipId: number) => {
    return scholarships.find((s) => s.id === scholarshipId);
  };

  // Handle fee field changes (manual input only)
  const handleFeeChange = (field: keyof typeof fees, value: number) => {
    setFees((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate total fees
  const getTotalFees = () => {
    return fees.tuitionFee + fees.otherFee + fees.miscellaneousFee + fees.laboratoryFee;
  };

  const handleFormSubmit = (data: CreateStudentInput) => {
    const program = data.gradeLevel === 'SENIOR_HIGH' ? data.yearLevel : data.program;
    const submitData: CreateStudentInput = {
      ...data,
      program,
      scholarships:
        selectedScholarships.length > 0
          ? selectedScholarships.map((scholarship) => ({
              id: scholarship.id,
              scholarshipId: scholarship.scholarshipId,
              academicYearId: scholarship.academicYearId ?? null,
              awardDate: scholarship.awardDate,
              startTerm: scholarship.startTerm,
              endTerm: scholarship.endTerm,
              grantAmount: scholarship.grantAmount,
              grantType: scholarship.grantType,
              scholarshipStatus: scholarship.scholarshipStatus,
            }))
          : undefined,
    };

    if (canEditFees) {
      submitData.fees = {
        tuitionFee: fees.tuitionFee,
        otherFee: fees.otherFee,
        miscellaneousFee: fees.miscellaneousFee,
        laboratoryFee: fees.laboratoryFee,
      };
    }

    // Show confirmation dialog when editing
    if (isEditing) {
      setPendingData(submitData);
      setShowConfirmDialog(true);
    } else {
      onSubmit(submitData);
    }
  };

  const handleConfirmSave = () => {
    if (pendingData) {
      onSubmit(pendingData);
      setPendingData(null);
      setShowConfirmDialog(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className={DIALOG_FORM_CLASS}>
      <div className={`${DIALOG_BODY_CLASS} flex flex-col gap-6`}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-3 col-span-1">
            <Label htmlFor="lastName" className="text-sm font-medium">
              Last Name
            </Label>
            <Input
              id="lastName"
              {...form.register('lastName', { required: true })}
              placeholder="Enter last name"
              className="h-10"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
                form.setValue('lastName', e.target.value);
              }}
            />
          </div>
          <div className="space-y-3 col-span-1">
            <Label htmlFor="firstName" className="text-sm font-medium">
              First Name
            </Label>
            <Input
              id="firstName"
              {...form.register('firstName', { required: true })}
              placeholder="Enter first name"
              className="h-10"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
                form.setValue('firstName', e.target.value);
              }}
            />
          </div>
          <div className="space-y-3 col-span-1">
            <Label htmlFor="middleInitial" className="text-sm font-medium">
              M.I.
            </Label>
            <Input
              id="middleInitial"
              {...form.register('middleInitial')}
              placeholder="Enter middle initial"
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
          <Label htmlFor="gradeLevel" className="text-sm font-medium">
            Grade Level
          </Label>
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

        {/* Term Type Selector - Only for College */}
        {selectedGradeLevel === 'COLLEGE' && (
          <div className="space-y-3">
            <Label htmlFor="termType" className="text-sm font-medium">
              Academic Term System
            </Label>
            <Controller
              name="termType"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || selectedTermType}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedTermType(value as TermType);
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select term system" />
                  </SelectTrigger>
                  <SelectContent>
                    {TERM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {TERM_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              {selectedTermType === 'TRIMESTER'
                ? '3 terms per year (typically 3-year programs)'
                : '2 terms per year (typically 4-year programs)'}
            </p>
          </div>
        )}

        {/* College Fields */}
        {selectedGradeLevel === 'COLLEGE' && (
          <>
            <div className="space-y-3">
              <Label htmlFor="course" className="text-sm font-medium">
                Course
              </Label>
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
                <Label htmlFor="customCourse" className="text-sm font-medium">
                  Enter Course Name
                </Label>
                <Input
                  id="customCourse"
                  value={customCourse}
                  onChange={(e) => {
                    setCustomCourse(e.target.value);
                    form.setValue('program', e.target.value);
                  }}
                  placeholder="Enter custom course name"
                  className="h-10"
                />
              </div>
            )}

            {selectedCourse && (
              <div className="space-y-3">
                <Label htmlFor="program" className="text-sm font-medium">
                  Major (Optional)
                </Label>
                <Select
                  value={selectedProgram}
                  onValueChange={(value) => {
                    setSelectedProgram(value);
                    if (value === 'None') {
                      const courseValue =
                        selectedCourse === 'Other' ? customCourse : selectedCourse;
                      form.setValue('program', courseValue);
                      setCustomProgram('');
                    } else if (value !== 'Other') {
                      const courseValue =
                        selectedCourse === 'Other' ? customCourse : selectedCourse;
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
                <Label htmlFor="customProgram" className="text-sm font-medium">
                  Enter Major Name
                </Label>
                <Input
                  id="customProgram"
                  value={customProgram}
                  onChange={(e) => {
                    setCustomProgram(e.target.value);
                    const courseValue = selectedCourse === 'Other' ? customCourse : selectedCourse;
                    form.setValue('program', `${courseValue} - ${e.target.value}`);
                  }}
                  placeholder="Enter custom major name"
                  className="h-10"
                />
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="yearLevel" className="text-sm font-medium">
                Year Level
              </Label>
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
          </>
        )}

        {/* Senior High Fields */}
        {selectedGradeLevel === 'SENIOR_HIGH' && (
          <div className="space-y-3">
            <Label htmlFor="yearLevel" className="text-sm font-medium">
              Year Level
            </Label>
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
        )}

        {/* Grade School Fields */}
        {selectedGradeLevel === 'GRADE_SCHOOL' && (
          <div className="space-y-3">
            <Label htmlFor="yearLevel" className="text-sm font-medium">
              Select Grade
            </Label>
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
            <Label htmlFor="yearLevel" className="text-sm font-medium">
              Year Level
            </Label>
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

        {/* Scholarship Assignment Section */}
        <div className="border-t pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Scholarship Assignment</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowScholarshipSelector(!showScholarshipSelector)}
              disabled={!currentGradeLevel}
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
                  const scholarshipDetails = getSelectedScholarshipDetails(
                    scholarship.scholarshipId
                  );
                  const source =
                    scholarshipDetails?.source ||
                    (scholarship.scholarshipName.includes('CHED') ? 'EXTERNAL' : 'INTERNAL');
                  const type = scholarshipDetails?.type || scholarship.scholarshipName;
                  const unavailableAcademicYearIds = getUnavailableAcademicYearIdsForScholarship(
                    selectedScholarships,
                    scholarship.clientKey,
                    scholarship.scholarshipId,
                    defaultAssignmentAcademicYearId
                  );

                  return (
                    <Card key={scholarship.clientKey} className="border-2 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-base">{scholarship.scholarshipName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">{type}</p>
                            {scholarship.grantType === 'TUITION_ONLY' && (
                              <Badge variant="outline" className="text-xs">
                                Free Tuition
                              </Badge>
                            )}
                            {scholarship.grantType === 'NONE' && (
                              <Badge variant="secondary" className="text-xs">
                                Honorific
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {getCoveredTermsLabel(scholarshipDetails?.coveredTerms)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeScholarship(scholarship.clientKey)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(18rem,1.4fr)_repeat(4,minmax(7.5rem,1fr))]">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Academic Year</Label>
                          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                            <Select
                              value={
                                scholarship.academicYearId ? String(scholarship.academicYearId) : ''
                              }
                              onValueChange={(value) =>
                                handleAcademicYearChange(scholarship.clientKey, value)
                              }
                              disabled={academicYears.length === 0}
                            >
                              <SelectTrigger className="h-9 min-w-[10rem] flex-1 text-sm">
                                <SelectValue
                                  placeholder={
                                    academicYears.length > 0 ? 'Select year' : 'No years'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {academicYears.map((academicYear) => {
                                  const isUnavailable = unavailableAcademicYearIds.has(
                                    academicYear.id
                                  );

                                  return (
                                    <SelectItem
                                      key={academicYear.id}
                                      value={String(academicYear.id)}
                                      disabled={isUnavailable}
                                    >
                                      {academicYear.year}
                                      {academicYear.isActive ? ' (Active)' : ''}
                                      {isUnavailable ? ' (Already selected)' : ''}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            {canManageAcademicYears && (
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() =>
                                    openCreateAcademicYearDialog(scholarship.clientKey)
                                  }
                                  title="Create academic year"
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => openEditAcademicYearDialog(scholarship.clientKey)}
                                  disabled={!scholarship.academicYearId}
                                  title="Edit selected academic year"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Start Term</Label>
                          <Input
                            placeholder="Enter start term"
                            value={scholarship.startTerm}
                            onChange={(e) =>
                              updateScholarship(scholarship.clientKey, 'startTerm', e.target.value)
                            }
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">End Term</Label>
                          <Input
                            placeholder="Enter end term"
                            value={scholarship.endTerm}
                            onChange={(e) =>
                              updateScholarship(scholarship.clientKey, 'endTerm', e.target.value)
                            }
                            className="h-9 text-sm"
                          />
                        </div>
                        {scholarship.grantType !== 'TUITION_ONLY' &&
                          scholarship.grantType !== 'NONE' && (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Grant Amount</Label>
                              <Input
                                type="number"
                                placeholder="Enter grant amount"
                                value={scholarship.grantAmount}
                                onChange={(e) =>
                                  updateScholarship(
                                    scholarship.clientKey,
                                    'grantAmount',
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="h-9 text-sm"
                              />
                            </div>
                          )}
                        {scholarship.grantType === 'TUITION_ONLY' ||
                        scholarship.grantType === 'NONE' ? (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Grant Type</Label>
                            <div className="h-9 flex items-center text-sm text-muted-foreground px-2">
                              Free Tuition
                            </div>
                          </div>
                        ) : null}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <Select
                            value={scholarship.scholarshipStatus}
                            onValueChange={(value) =>
                              updateScholarship(scholarship.clientKey, 'scholarshipStatus', value)
                            }
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
                        <Badge
                          variant={source === 'INTERNAL' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {source === 'INTERNAL' ? 'Internal' : 'External'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getCoveredTermsLabel(scholarshipDetails?.coveredTerms)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {academicYears.find((year) => year.id === scholarship.academicYearId)
                            ?.year || 'No year'}
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
                  <Select
                    value={scholarshipSourceFilter}
                    onValueChange={(value: 'all' | 'INTERNAL' | 'EXTERNAL') =>
                      setScholarshipSourceFilter(value)
                    }
                  >
                    <SelectTrigger className="h-9 text-sm w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scholarships</SelectItem>
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
                    {!currentGradeLevel
                      ? 'Select a grade level before adding a scholarship'
                      : scholarshipSearch || scholarshipSourceFilter !== 'all'
                        ? 'No scholarships match your filters'
                        : 'All scholarships have been added'}
                  </p>
                ) : (
                  filteredScholarships.map((scholarship) => {
                    return (
                      <div
                        key={scholarship.id}
                        className="p-4 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-base">{scholarship.scholarshipName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-sm text-muted-foreground">{scholarship.type}</p>
                            <Badge variant="outline" className="text-xs">
                              {getCoveredTermsLabel(scholarship.coveredTerms)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge
                              variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}
                              className="text-sm"
                            >
                              {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                            </Badge>
                            <p className="text-sm font-semibold mt-1">
                              ₱{scholarship.amount.toLocaleString()}
                            </p>
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

        {/* Fee Information Section */}
        {canEditFees && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Fee Information</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm max-w-xs">
                      Enter the actual amounts this student needs to pay. These vary per student.
                      Total Fees are auto-calculated.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Card className="border-2 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Tuition Fee */}
                <div className="space-y-2">
                  <Label htmlFor="tuitionFee" className="text-sm font-medium">
                    Tuition Fee
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₱
                    </span>
                    <CurrencyInput
                      id="tuitionFee"
                      value={fees.tuitionFee}
                      onChange={(value) => handleFeeChange('tuitionFee', value)}
                      placeholder="0.00"
                      className="pl-7 h-10"
                    />
                  </div>
                </div>

                {/* Other Fees */}
                <div className="space-y-2">
                  <Label htmlFor="otherFee" className="text-sm font-medium">
                    Other Fees
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₱
                    </span>
                    <CurrencyInput
                      id="otherFee"
                      value={fees.otherFee}
                      onChange={(value) => handleFeeChange('otherFee', value)}
                      placeholder="0.00"
                      className="pl-7 h-10"
                    />
                  </div>
                </div>

                {/* Miscellaneous Fee */}
                <div className="space-y-2">
                  <Label htmlFor="miscellaneousFee" className="text-sm font-medium">
                    Miscellaneous Fee
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₱
                    </span>
                    <CurrencyInput
                      id="miscellaneousFee"
                      value={fees.miscellaneousFee}
                      onChange={(value) => handleFeeChange('miscellaneousFee', value)}
                      placeholder="0.00"
                      className="pl-7 h-10"
                    />
                  </div>
                </div>

                {/* Laboratory Fee */}
                <div className="space-y-2">
                  <Label htmlFor="laboratoryFee" className="text-sm font-medium">
                    Laboratory Fee
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₱
                    </span>
                    <CurrencyInput
                      id="laboratoryFee"
                      value={fees.laboratoryFee}
                      onChange={(value) => handleFeeChange('laboratoryFee', value)}
                      placeholder="0.00"
                      className="pl-7 h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Total Fees Summary */}
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-sm font-medium">Total Fees:</span>
                <span className="text-lg font-bold text-primary">
                  ₱
                  {getTotalFees().toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
        <DialogContent className={COMPACT_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle>
              {editingAcademicYear ? 'Edit Academic Year' : 'Create Academic Year'}
            </DialogTitle>
            <DialogDescription>
              {editingAcademicYear
                ? 'Update the selected academic year.'
                : 'Add a new academic year and assign it to this scholarship.'}
            </DialogDescription>
          </DialogHeader>
          <div className={`${DIALOG_BODY_CLASS} space-y-4`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_1.15fr]">
              <div className="space-y-2">
                <Label htmlFor="student-scholarship-year-start-year">Start Year</Label>
                <Input
                  id="student-scholarship-year-start-year"
                  type="number"
                  min={1900}
                  max={2200}
                  step={1}
                  value={academicYearStartYearInput}
                  onChange={(event) => handleAcademicYearStartYearChange(event.target.value)}
                  onBlur={handleAcademicYearStartYearBlur}
                  className="h-11 border-slate-300 text-lg font-semibold"
                  required
                />
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold text-emerald-700">Academic Year Preview</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-950">
                  {academicYearFormData.year || 'Select start year'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="student-scholarship-year-start">Start Date</Label>
                <Input
                  id="student-scholarship-year-start"
                  type="date"
                  value={academicYearFormData.startDate}
                  onChange={(event) =>
                    handleAcademicYearFormChange('startDate', event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-scholarship-year-end">End Date</Label>
                <Input
                  id="student-scholarship-year-end"
                  type="date"
                  value={academicYearFormData.endDate}
                  onChange={(event) => handleAcademicYearFormChange('endDate', event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-scholarship-year-semester">Current Semester</Label>
              <Select
                value={academicYearFormData.semester}
                onValueChange={(value) => handleAcademicYearFormChange('semester', value)}
              >
                <SelectTrigger id="student-scholarship-year-semester">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHOLARSHIP_TERMS.map((term) => (
                    <SelectItem key={term} value={term}>
                      {SCHOLARSHIP_TERM_LABELS[term]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-md border p-3">
              <Checkbox
                id="student-scholarship-year-active"
                checked={!!academicYearFormData.isActive}
                onCheckedChange={(checked) =>
                  handleAcademicYearFormChange('isActive', checked === true)
                }
              />
              <Label
                htmlFor="student-scholarship-year-active"
                className="cursor-pointer font-normal"
              >
                Set as active academic year
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-scholarship-year-promotion">Promotion Date</Label>
              <Input
                id="student-scholarship-year-promotion"
                type="date"
                value={academicYearFormData.promotionDate || ''}
                onChange={(event) =>
                  handleAcademicYearFormChange('promotionDate', event.target.value)
                }
              />
            </div>
          </div>
          <DialogFooter className={DIALOG_FOOTER_CLASS}>
            <Button type="button" variant="outline" onClick={() => setYearDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAcademicYearSubmit}
              disabled={
                academicYearSubmitting ||
                !hasValidAcademicYearStartYear ||
                !academicYearFormData.startDate ||
                !academicYearFormData.endDate
              }
            >
              {academicYearSubmitting ? 'Saving...' : editingAcademicYear ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogFooter className={DIALOG_FOOTER_CLASS}>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient" disabled={loading} className="min-w-32">
          {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Student'}
        </Button>
      </DialogFooter>

      {/* Confirmation Dialog for Editing */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className={COMPACT_DIALOG_CONTENT_CLASS}>
          <AlertDialogHeader className={DIALOG_HEADER_CLASS}>
            <AlertDialogTitle>Confirm Save Changes</AlertDialogTitle>
            <AlertDialogDescription>
              {studentName ? (
                <>
                  You are about to save changes to <strong>{studentName}</strong>&apos;s record.
                </>
              ) : (
                'Are you sure you want to save these changes?'
              )}
              <br />
              <span className="text-sm mt-2">
                Please review all information carefully before confirming.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={DIALOG_FOOTER_CLASS}>
            <AlertDialogCancel onClick={() => setPendingData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave} className="min-w-32">
              Confirm Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
