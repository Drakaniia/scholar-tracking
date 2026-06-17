'use client';

import { useState } from 'react';

import { CalendarPlus, Pencil } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';

import {
  COMPACT_DIALOG_CONTENT_CLASS,
  DIALOG_BODY_CLASS,
  DIALOG_FOOTER_CLASS,
  DIALOG_FORM_CLASS,
  DIALOG_HEADER_CLASS,
} from '@/components/shared/dialog-layout';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import {
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYear,
} from '@/hooks/use-queries';
import { LGU_COVERED_TERMS, parseCoveredTerms, serializeCoveredTerms } from '@/lib/terms';
import {
  AcademicYear,
  AcademicYearInput,
  CreateScholarshipInput,
  GRADE_LEVELS,
  GRADE_LEVEL_LABELS,
  GRANT_TYPES,
  GRANT_TYPE_LABELS,
  GradeLevel,
  GrantType,
  SCHOLARSHIP_SOURCES,
  SCHOLARSHIP_SOURCE_LABELS,
  SCHOLARSHIP_TERMS,
  SCHOLARSHIP_TERM_LABELS,
  ScholarshipTerm,
} from '@/types';

const SCHOLARSHIP_STATUSES = ['Active', 'Inactive', 'Closed'] as const;

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
    defaultValues?.eligibleGradeLevels?.split(',').map((l) => l.trim() as GradeLevel) || []
  );
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(
    defaultValues?.eligiblePrograms?.split(',').map((p) => p.trim()) || []
  );
  const [selectedGrantType, setSelectedGrantType] = useState<GrantType>(
    defaultValues?.grantType || 'FULL'
  );
  const [selectedCoveredTerms, setSelectedCoveredTerms] = useState<ScholarshipTerm[]>(
    parseCoveredTerms(defaultValues?.coveredTerms)
  );
  const [coversTuition, setCoversTuition] = useState(defaultValues?.coversTuition || false);
  const [coversMiscellaneous, setCoversMiscellaneous] = useState(
    defaultValues?.coversMiscellaneous || false
  );
  const [coversLaboratory, setCoversLaboratory] = useState(
    defaultValues?.coversLaboratory || false
  );
  const [coversOther, setCoversOther] = useState(defaultValues?.coversOther || false);
  const [otherFeeName, setOtherFeeName] = useState(defaultValues?.otherFeeName || '');
  const [showOtherFeeDialog, setShowOtherFeeDialog] = useState(false);
  const [tuitionFee, setTuitionFee] = useState(defaultValues?.tuitionFee || 0);
  const [miscellaneousFee, setMiscellaneousFee] = useState(defaultValues?.miscellaneousFee || 0);
  const [laboratoryFee, setLaboratoryFee] = useState(defaultValues?.laboratoryFee || 0);
  const [otherFee, setOtherFee] = useState(defaultValues?.otherFee || 0);
  const [amountSubsidy, setAmountSubsidy] = useState(defaultValues?.amountSubsidy || 0);

  // Academic Year management
  const { data: academicYearsData } = useAcademicYears();
  const createAcademicYearMutation = useCreateAcademicYear();
  const updateAcademicYearMutation = useUpdateAcademicYear();
  const academicYears = ((academicYearsData?.data || []) as AcademicYear[]).slice().sort((a, b) => {
    const left = new Date(a.startDate).getTime();
    const right = new Date(b.startDate).getTime();
    return right - left;
  });
  const [academicYearId, setAcademicYearId] = useState<number | null>(
    defaultValues?.academicYearId ?? null
  );
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [editingAcademicYear, setEditingAcademicYear] = useState<AcademicYear | null>(null);
  const [academicYearFormData, setAcademicYearFormData] = useState<AcademicYearInput>(() =>
    getDefaultAcademicYearInput()
  );
  const [academicYearStartYearInput, setAcademicYearStartYearInput] = useState(() =>
    String(getAcademicYearStartYear(getDefaultAcademicYearInput().year) || '')
  );
  const [academicYearSubmitting, setAcademicYearSubmitting] = useState(false);

  const selectedAcademicYearStartYear = getAcademicYearStartYear(academicYearFormData.year);

  // Calculate total fees
  const totalFees = tuitionFee + miscellaneousFee + laboratoryFee + otherFee;

  // Calculate percent subsidy from amount subsidy (amount / total fees)
  // Result is in decimal form (e.g., 0.1667 for 16.67%)
  const calculatedPercentSubsidy = totalFees > 0 ? amountSubsidy / totalFees : 0;
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
      if (value === 'LGU') {
        setSelectedCoveredTerms(parseCoveredTerms(LGU_COVERED_TERMS));
      }
    }
  };

  const handleCustomTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomType(value);
    form.setValue('type', value);
  };

  const handleGradeLevelToggle = (level: GradeLevel) => {
    const updated = selectedGradeLevels.includes(level)
      ? selectedGradeLevels.filter((l) => l !== level)
      : [...selectedGradeLevels, level];
    setSelectedGradeLevels(updated);
    form.setValue('eligibleGradeLevels', updated.join(','));
  };

  const handleProgramToggle = (program: string) => {
    const updated = selectedPrograms.includes(program)
      ? selectedPrograms.filter((p) => p !== program)
      : [...selectedPrograms, program];
    setSelectedPrograms(updated);
    form.setValue('eligiblePrograms', updated.join(','));
  };

  const handleCoveredTermToggle = (term: ScholarshipTerm) => {
    const updated = selectedCoveredTerms.includes(term)
      ? selectedCoveredTerms.filter((selectedTerm) => selectedTerm !== term)
      : [...selectedCoveredTerms, term];
    setSelectedCoveredTerms(updated);
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

  // Academic Year handlers
  const handleAcademicYearChange = (value: string) => {
    const id = Number(value);
    setAcademicYearId(Number.isInteger(id) && id > 0 ? id : null);
  };

  const openCreateAcademicYearDialog = () => {
    const defaultInput = getDefaultAcademicYearInput();
    setEditingAcademicYear(null);
    setAcademicYearFormData(defaultInput);
    setAcademicYearStartYearInput(String(getAcademicYearStartYear(defaultInput.year) || ''));
    setYearDialogOpen(true);
  };

  const openEditAcademicYearDialog = () => {
    const year = academicYears.find((y) => y.id === academicYearId) || null;
    if (!year) return;

    setEditingAcademicYear(year);
    setAcademicYearStartYearInput(String(getAcademicYearStartYear(year.year) || ''));
    setAcademicYearFormData({
      year: year.year,
      startDate: toDateInputValue(year.startDate),
      endDate: toDateInputValue(year.endDate),
      semester: year.semester,
      isActive: year.isActive,
      promotionDate: toDateInputValue(year.promotionDate),
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
        setAcademicYearId(savedAcademicYear.id);
      }
      setYearDialogOpen(false);
      setEditingAcademicYear(null);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
    } finally {
      setAcademicYearSubmitting(false);
    }
  };

  const handleFormSubmit = (data: CreateScholarshipInput) => {
    if (showCustomType && customType) {
      data.type = customType;
    }
    data.eligibleGradeLevels = selectedGradeLevels.join(',');
    data.eligiblePrograms = selectedPrograms.length > 0 ? selectedPrograms.join(',') : null;
    data.coveredTerms = serializeCoveredTerms(selectedCoveredTerms);
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
    data.academicYearId = academicYearId;
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className={DIALOG_FORM_CLASS}>
      <div className={`${DIALOG_BODY_CLASS} flex flex-col gap-4`}>
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        {/* Academic Year */}
        <div className="space-y-2">
          <Label htmlFor="academicYear">Academic Year</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={academicYearId ? String(academicYearId) : ''}
                onValueChange={handleAcademicYearChange}
              >
                <SelectTrigger id="academicYear">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={String(year.id)}>
                      {year.year} - {SCHOLARSHIP_TERM_LABELS[year.semester as ScholarshipTerm]} {year.isActive ? '(Active)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openCreateAcademicYearDialog}
              title="Create Academic Year"
            >
              <CalendarPlus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openEditAcademicYearDialog}
              disabled={!academicYearId}
              title="Edit Academic Year"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Covered Semesters</Label>
          <div className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-3">
            {SCHOLARSHIP_TERMS.map((term) => (
              <div key={term} className="flex items-center space-x-2">
                <Checkbox
                  id={`covered-term-${term}`}
                  checked={selectedCoveredTerms.includes(term)}
                  onCheckedChange={() => handleCoveredTermToggle(term)}
                />
                <Label
                  htmlFor={`covered-term-${term}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {SCHOLARSHIP_TERM_LABELS[term]}
                </Label>
              </div>
            ))}
          </div>
          {selectedCoveredTerms.length === 0 && (
            <p className="text-xs text-destructive">Select at least one semester.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Eligible Grade Levels</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                'BS Education',
                'BA Education',
                'BS Computer Science',
                'BS Information Technology',
                'BS Nursing',
                'BS Accountancy',
              ].map((program) => (
                <div key={program} className="flex items-center space-x-2">
                  <Checkbox
                    id={`program-${program}`}
                    checked={selectedPrograms.includes(program)}
                    onCheckedChange={() => handleProgramToggle(program)}
                  />
                  <Label
                    htmlFor={`program-${program}`}
                    className="text-sm font-normal cursor-pointer"
                  >
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
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedGrantType(value as GrantType);
                }}
              >
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
            {selectedGrantType === 'FULL' &&
              'Student receives full cash grant and tuition coverage.'}
          </p>
        </div>

        {/* Show fee coverage options for non-FULL grant types */}
        {selectedGrantType !== 'FULL' && selectedGrantType !== 'NONE' && (
          <div className="space-y-2">
            <Label>Covers</Label>
            <div className="grid grid-cols-2 gap-3 rounded-md border p-3 sm:grid-cols-4">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <span className="text-lg font-semibold">
                ₱
                {totalFees.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground">
                Subsidy: ₱
                {amountSubsidy.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs font-medium text-primary">
                {percentSubsidyDisplay}% of total fees
              </span>
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
            The actual subsidy amount in pesos. % Subsidy is automatically calculated in reports
            based on Total Fees.
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
      </div>

      {/* Academic Year Create/Edit Dialog */}
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
                <Label htmlFor="scholarship-year-start-year">Start Year</Label>
                <Input
                  id="scholarship-year-start-year"
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
                <Label htmlFor="scholarship-year-start">Start Date</Label>
                <Input
                  id="scholarship-year-start"
                  type="date"
                  value={academicYearFormData.startDate}
                  onChange={(event) =>
                    handleAcademicYearFormChange('startDate', event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scholarship-year-end">End Date</Label>
                <Input
                  id="scholarship-year-end"
                  type="date"
                  value={academicYearFormData.endDate}
                  onChange={(event) => handleAcademicYearFormChange('endDate', event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scholarship-year-semester">Current Semester</Label>
              <Select
                value={academicYearFormData.semester}
                onValueChange={(value) => handleAcademicYearFormChange('semester', value)}
              >
                <SelectTrigger id="scholarship-year-semester">
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
                id="scholarship-year-active"
                checked={!!academicYearFormData.isActive}
                onCheckedChange={(checked) =>
                  handleAcademicYearFormChange('isActive', checked === true)
                }
              />
              <Label htmlFor="scholarship-year-active" className="cursor-pointer font-normal">
                Set as active academic year
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scholarship-year-promotion">Promotion Date</Label>
              <Input
                id="scholarship-year-promotion"
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
                !selectedAcademicYearStartYear ||
                !academicYearFormData.startDate ||
                !academicYearFormData.endDate
              }
            >
              {academicYearSubmitting ? 'Saving...' : editingAcademicYear ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Other Fee Name Dialog */}
      <Dialog open={showOtherFeeDialog} onOpenChange={setShowOtherFeeDialog}>
        <DialogContent className={COMPACT_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle>Name of Other Fee</DialogTitle>
            <DialogDescription>
              Enter the name of the other fee you want to cover (e.g., Library Fee, Sports Fee,
              etc.)
            </DialogDescription>
          </DialogHeader>
          <div className={DIALOG_BODY_CLASS}>
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
          <DialogFooter className={DIALOG_FOOTER_CLASS}>
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

      <DialogFooter className={DIALOG_FOOTER_CLASS}>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="gradient"
          disabled={loading || selectedCoveredTerms.length === 0}
          className="min-w-32"
        >
          {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
}
