'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Save, X, DollarSign, Percent, GraduationCap } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { queryKeys } from '@/hooks/use-queries';

interface StudentFees {
    id: number;
    studentId: number;
    tuitionFee: number;
    miscellaneousFee: number;
    laboratoryFee: number;
    otherFee: number;
    amountSubsidy: number;
    percentSubsidy: number;
    term: string;
    academicYear: string;
}

interface Scholarship {
    id: number;
    scholarshipName: string;
    tuitionFee: number;
    miscellaneousFee: number;
    laboratoryFee: number;
    otherFee: number;
    amountSubsidy: number;
    coversTuition: boolean;
    coversMiscellaneous: boolean;
    coversLaboratory: boolean;
    coversOther: boolean;
}

interface StudentScholarship {
    id: number;
    scholarshipId: number;
    scholarshipStatus: string;
    scholarship: Scholarship;
}

interface StudentFeesManagerProps {
    studentId: number;
    readOnly?: boolean;
}

export function StudentFeesManager({ studentId, readOnly = false }: StudentFeesManagerProps) {
    const queryClient = useQueryClient();
    const [fees, setFees] = useState<StudentFees[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<Partial<StudentFees>>({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newFeeData, setNewFeeData] = useState<Partial<StudentFees>>({
        tuitionFee: 0,
        miscellaneousFee: 0,
        laboratoryFee: 0,
        otherFee: 0,
        amountSubsidy: 0,
        term: '1st Semester',
        academicYear: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString(),
    });
    const [studentScholarships, setStudentScholarships] = useState<StudentScholarship[]>([]);
    const [totalScholarshipCoverage, setTotalScholarshipCoverage] = useState({
        tuitionFee: 0,
        miscellaneousFee: 0,
        laboratoryFee: 0,
        otherFee: 0,
        amountSubsidy: 0,
    });

    // Calculate total fees
    const calculateTotalFees = (fee: Partial<StudentFees>) => {
        return Number(fee.tuitionFee || 0) + 
               Number(fee.miscellaneousFee || 0) + 
               Number(fee.laboratoryFee || 0) + 
               Number(fee.otherFee || 0);
    };

    // Calculate percent subsidy (as percentage, e.g., 16.67 for 16.67%)
    const calculatePercentSubsidy = (amountSubsidy: number, totalFees: number) => {
        return totalFees > 0 ? Number(((amountSubsidy / totalFees) * 100).toFixed(2)) : 0;
    };

    const fetchFees = useCallback(async () => {
        try {
            const res = await fetch(`/api/students/${studentId}/fees`);
            const json = await res.json();
            if (json.success) {
                setFees(json.data);
            }
        } catch (error) {
            console.error('Error fetching fees:', error);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    const fetchStudentScholarships = useCallback(async () => {
        try {
            const res = await fetch(`/api/students/${studentId}/scholarships`);
            const json = await res.json();
            if (json.success) {
                const activeScholarships = json.data.filter((ss: StudentScholarship) =>
                    ss.scholarshipStatus === 'Active'
                );
                setStudentScholarships(activeScholarships);
                calculateTotalScholarshipCoverage(activeScholarships);
            }
        } catch (error) {
            console.error('Error fetching student scholarships:', error);
        }
    }, [studentId]);

    useEffect(() => {
        fetchFees();
        fetchStudentScholarships();
    }, [fetchFees, fetchStudentScholarships]);

    const calculateTotalScholarshipCoverage = (scholarships: StudentScholarship[]) => {
        const coverage = {
            tuitionFee: 0,
            miscellaneousFee: 0,
            laboratoryFee: 0,
            otherFee: 0,
            amountSubsidy: 0,
        };

        scholarships.forEach((ss) => {
            const sch = ss.scholarship;
            if (sch.coversTuition) coverage.tuitionFee += Number(sch.tuitionFee) || 0;
            if (sch.coversMiscellaneous) coverage.miscellaneousFee += Number(sch.miscellaneousFee) || 0;
            if (sch.coversLaboratory) coverage.laboratoryFee += Number(sch.laboratoryFee) || 0;
            if (sch.coversOther) coverage.otherFee += Number(sch.otherFee) || 0;
            coverage.amountSubsidy += Number(sch.amountSubsidy) || 0;
        });

        setTotalScholarshipCoverage(coverage);
    };

    const handleEdit = (fee: StudentFees) => {
        setEditingId(fee.id);
        setEditData({ ...fee });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleSaveEdit = async () => {
        try {
            const totalFees = calculateTotalFees(editData);
            const percentSubsidy = calculatePercentSubsidy(Number(editData.amountSubsidy || 0), totalFees);

            const res = await fetch(`/api/students/${studentId}/fees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editData.id,
                    tuitionFee: editData.tuitionFee,
                    miscellaneousFee: editData.miscellaneousFee,
                    laboratoryFee: editData.laboratoryFee,
                    otherFee: editData.otherFee,
                    amountSubsidy: editData.amountSubsidy,
                    percentSubsidy,
                    term: editData.term,
                    academicYear: editData.academicYear,
                    studentId,
                }),
            });

            const json = await res.json();
            if (json.success) {
                await fetchFees();
                setEditingId(null);
                setEditData({});
                // Invalidate dashboard queries so report page shows fresh data
                queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
                queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
            }
        } catch (error) {
            console.error('Error updating fees:', error);
        }
    };

    const handleAddNew = async () => {
        try {
            const totalFees = calculateTotalFees(newFeeData);
            const percentSubsidy = calculatePercentSubsidy(Number(newFeeData.amountSubsidy || 0), totalFees);

            const res = await fetch(`/api/students/${studentId}/fees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newFeeData,
                    percentSubsidy,
                    studentId,
                }),
            });

            const json = await res.json();
            if (json.success) {
                await fetchFees();
                setShowAddForm(false);
                setNewFeeData({
                    tuitionFee: 0,
                    miscellaneousFee: 0,
                    laboratoryFee: 0,
                    otherFee: 0,
                    amountSubsidy: 0,
                    term: '1st Semester',
                    academicYear: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString(),
                });
                // Invalidate dashboard queries so report page shows fresh data
                queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
                queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
            }
        } catch (error) {
            console.error('Error adding fees:', error);
        }
    };

    const updateEditField = (field: keyof StudentFees, value: number | string) => {
        setEditData(prev => {
            const updated = { ...prev, [field]: value };
            // Auto-calculate percentSubsidy when amountSubsidy or fee fields change
            if (field === 'amountSubsidy' || ['tuitionFee', 'miscellaneousFee', 'laboratoryFee', 'otherFee'].includes(field)) {
                const totalFees = calculateTotalFees(updated);
                updated.percentSubsidy = calculatePercentSubsidy(Number(updated.amountSubsidy || 0), totalFees);
            }
            return updated;
        });
    };

    const updateNewFeeField = (field: keyof StudentFees, value: number | string) => {
        setNewFeeData(prev => {
            const updated = { ...prev, [field]: value };
            // Auto-calculate percentSubsidy when amountSubsidy or fee fields change
            if (field === 'amountSubsidy' || ['tuitionFee', 'miscellaneousFee', 'laboratoryFee', 'otherFee'].includes(field)) {
                const totalFees = calculateTotalFees(updated);
                updated.percentSubsidy = calculatePercentSubsidy(Number(updated.amountSubsidy || 0), totalFees);
            }
            return updated;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg">Student Fees</h3>
                    <p className="text-sm text-muted-foreground">Manage tuition and fee breakdown</p>
                </div>
                {!readOnly && !showAddForm && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Fees
                    </Button>
                )}
            </div>

            {/* Scholarship Coverage Summary */}
            {studentScholarships.length > 0 && (
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-green-600" />
                            <CardTitle className="text-base text-green-800">Scholarship Fee Coverage</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {studentScholarships.map((ss) => (
                                    <Badge key={ss.id} variant="outline" className="bg-white text-green-700 border-green-300">
                                        {ss.scholarship.scholarshipName}
                                    </Badge>
                                ))}
                            </div>
                            <div className="grid grid-cols-5 gap-4 pt-3 border-t border-green-200">
                                {totalScholarshipCoverage.tuitionFee > 0 && (
                                    <div>
                                        <p className="text-xs text-green-600 font-medium">Tuition</p>
                                        <p className="text-sm font-semibold text-green-800">₱{totalScholarshipCoverage.tuitionFee.toLocaleString()}</p>
                                    </div>
                                )}
                                {totalScholarshipCoverage.miscellaneousFee > 0 && (
                                    <div>
                                        <p className="text-xs text-green-600 font-medium">Misc</p>
                                        <p className="text-sm font-semibold text-green-800">₱{totalScholarshipCoverage.miscellaneousFee.toLocaleString()}</p>
                                    </div>
                                )}
                                {totalScholarshipCoverage.laboratoryFee > 0 && (
                                    <div>
                                        <p className="text-xs text-green-600 font-medium">Lab</p>
                                        <p className="text-sm font-semibold text-green-800">₱{totalScholarshipCoverage.laboratoryFee.toLocaleString()}</p>
                                    </div>
                                )}
                                {totalScholarshipCoverage.otherFee > 0 && (
                                    <div>
                                        <p className="text-xs text-green-600 font-medium">Other</p>
                                        <p className="text-sm font-semibold text-green-800">₱{totalScholarshipCoverage.otherFee.toLocaleString()}</p>
                                    </div>
                                )}
                                <div className="text-right">
                                    <p className="text-xs text-green-600 font-medium">Total Subsidy</p>
                                    <p className="text-lg font-bold text-green-800">₱{totalScholarshipCoverage.amountSubsidy.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Add New Fee Form */}
            {!readOnly && showAddForm && (
                <Card className="border-2 border-primary/20">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Add New Fee Record</CardTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setShowAddForm(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-term">Term</Label>
                                <Input
                                    id="new-term"
                                    value={newFeeData.term}
                                    onChange={(e) => updateNewFeeField('term', e.target.value)}
                                    placeholder="1st Semester"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-academic-year">Academic Year</Label>
                                <Input
                                    id="new-academic-year"
                                    value={newFeeData.academicYear}
                                    onChange={(e) => updateNewFeeField('academicYear', e.target.value)}
                                    placeholder="2025-2026"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-tuition">Tuition Fee (₱)</Label>
                                <CurrencyInput
                                    id="new-tuition"
                                    value={newFeeData.tuitionFee || 0}
                                    onChange={(value) => updateNewFeeField('tuitionFee', value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-misc">Miscellaneous Fee (₱)</Label>
                                <CurrencyInput
                                    id="new-misc"
                                    value={newFeeData.miscellaneousFee || 0}
                                    onChange={(value) => updateNewFeeField('miscellaneousFee', value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-lab">Laboratory Fee (₱)</Label>
                                <CurrencyInput
                                    id="new-lab"
                                    value={newFeeData.laboratoryFee || 0}
                                    onChange={(value) => updateNewFeeField('laboratoryFee', value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-other">Other Fee (₱)</Label>
                                <CurrencyInput
                                    id="new-other"
                                    value={newFeeData.otherFee || 0}
                                    onChange={(value) => updateNewFeeField('otherFee', value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-subsidy">Amount Subsidy (₱)</Label>
                                <CurrencyInput
                                    id="new-subsidy"
                                    value={newFeeData.amountSubsidy || 0}
                                    onChange={(value) => updateNewFeeField('amountSubsidy', value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-percent">% Subsidy</Label>
                                <div className="relative">
                                    <Input
                                        id="new-percent"
                                        type="text"
                                        value={`${newFeeData.percentSubsidy ? Number(newFeeData.percentSubsidy).toFixed(2) : '0.00'}%`}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                            <div className="text-sm">
                                <span className="text-muted-foreground">Total Fees:</span>
                                <span className="font-semibold ml-2">{formatCurrency(calculateTotalFees(newFeeData))}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAddForm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleAddNew}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Fees
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Fees List */}
            {fees.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <DollarSign className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-sm">No fee records found</p>
                        <p className="text-xs mt-1">Fees are automatically created when scholarships are assigned</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {fees.map((fee) => {
                        const isEditing = editingId === fee.id;
                        const totalFees = calculateTotalFees(isEditing ? editData : fee);

                        return (
                            <Card key={fee.id} className={isEditing ? 'border-2 border-primary/50' : ''}>
                                <CardContent className="p-4">
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Term</Label>
                                                    <Input
                                                        value={editData.term || ''}
                                                        onChange={(e) => updateEditField('term', e.target.value)}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Academic Year</Label>
                                                    <Input
                                                        value={editData.academicYear || ''}
                                                        onChange={(e) => updateEditField('academicYear', e.target.value)}
                                                        className="h-9"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Tuition Fee (₱)</Label>
                                                    <CurrencyInput
                                                        value={editData.tuitionFee || 0}
                                                        onChange={(value) => updateEditField('tuitionFee', value)}
                                                        placeholder="0.00"
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Miscellaneous Fee (₱)</Label>
                                                    <CurrencyInput
                                                        value={editData.miscellaneousFee || 0}
                                                        onChange={(value) => updateEditField('miscellaneousFee', value)}
                                                        placeholder="0.00"
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Laboratory Fee (₱)</Label>
                                                    <CurrencyInput
                                                        value={editData.laboratoryFee || 0}
                                                        onChange={(value) => updateEditField('laboratoryFee', value)}
                                                        placeholder="0.00"
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Other Fee (₱)</Label>
                                                    <CurrencyInput
                                                        value={editData.otherFee || 0}
                                                        onChange={(value) => updateEditField('otherFee', value)}
                                                        placeholder="0.00"
                                                        className="h-9"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Amount Subsidy (₱)</Label>
                                                    <CurrencyInput
                                                        value={editData.amountSubsidy || 0}
                                                        onChange={(value) => updateEditField('amountSubsidy', value)}
                                                        placeholder="0.00"
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">% Subsidy</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            value={`${Number(editData.percentSubsidy || 0).toFixed(2)}%`}
                                                            disabled
                                                            className="h-9 bg-muted"
                                                        />
                                                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t">
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground">Total Fees:</span>
                                                    <span className="font-semibold ml-2">{formatCurrency(totalFees)}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleCancelEdit}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleSaveEdit}
                                                        className="bg-gradient-to-r from-green-500 to-emerald-600"
                                                    >
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Save
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline">{fee.term} {fee.academicYear}</Badge>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {Number(fee.percentSubsidy).toFixed(2)}% subsidy
                                                    </Badge>
                                                </div>
                                                {!readOnly && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(fee)}
                                                    >
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-5 gap-4 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Tuition</p>
                                                    <p className="font-medium">{formatCurrency(fee.tuitionFee)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Miscellaneous</p>
                                                    <p className="font-medium">{formatCurrency(fee.miscellaneousFee)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Laboratory</p>
                                                    <p className="font-medium">{formatCurrency(fee.laboratoryFee)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Other</p>
                                                    <p className="font-medium">{formatCurrency(fee.otherFee)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Total Fees</p>
                                                    <p className="font-semibold">{formatCurrency(totalFees)}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Amount Subsidy</p>
                                                    <p className="font-semibold text-green-600">{formatCurrency(fee.amountSubsidy)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">% Subsidy</p>
                                                    <p className="font-semibold text-primary">{Number(fee.percentSubsidy).toFixed(2)}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
