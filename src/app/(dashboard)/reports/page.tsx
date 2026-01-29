'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ExportButton } from '@/components/shared';
import { fetchWithCache } from '@/lib/cache';

interface DetailedStudent {
  id: number;
  studentNo: string;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  gradeLevel: string;
  yearLevel: string;
  scholarship: {
    scholarshipName: string;
    type: string;
  } | null;
  fees: Array<{
    tuitionFee: number;
    otherFee: number;
    miscellaneousFee: number;
    laboratoryFee: number;
    amountSubsidy: number;
    percentSubsidy: number;
  }>;
}

const GRADE_LEVEL_LABELS: Record<string, string> = {
  GRADE_SCHOOL: 'Grade School',
  JUNIOR_HIGH: 'Junior High',
  SENIOR_HIGH: 'Senior High',
  COLLEGE: 'College',
};

const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'];
const SCHOLARSHIP_TYPES = ['PAEB', 'CHED', 'LGU', 'SCHOOL_GRANT'];

export default function ReportsPage() {
  const [detailedStudents, setDetailedStudents] = useState<DetailedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetailedView();
  }, []);

  const fetchDetailedView = async () => {
    try {
      const url = '/api/dashboard/detailed';
      const json = await fetchWithCache<{ success: boolean; data: DetailedStudent[] }>(
        url,
        undefined,
        5 * 60 * 1000 // 5 minutes cache
      );
      
      if (json.success) {
        setDetailedStudents(json.data);
      }
    } catch (error) {
      console.error('Error fetching detailed view:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentsByGradeLevelAndScholarship = (gradeLevel: string, scholarshipType: string) => {
    return detailedStudents.filter(
      (s) => s.gradeLevel === gradeLevel && s.scholarship?.type === scholarshipType
    );
  };

  const calculateTotalFees = (fees: DetailedStudent['fees'][0]) => {
    if (!fees) return 0;
    return Number(fees.tuitionFee) + Number(fees.otherFee) + 
           Number(fees.miscellaneousFee) + Number(fees.laboratoryFee);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Detailed student scholarship reports and analytics"
      >
        <ExportButton endpoint="/api/export/students" filename="detailed-student-scholarship-report" />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Detailed Student Scholarship Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {GRADE_LEVELS.map((gradeLevel) => {
              // Check if this grade level has any students with scholarships
              const hasStudents = SCHOLARSHIP_TYPES.some(type => 
                getStudentsByGradeLevelAndScholarship(gradeLevel, type).length > 0
              );

              if (!hasStudents) return null;

              return (
                <div key={gradeLevel} className="space-y-4">
                  {/* Master Header - Grade Level */}
                  <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg">
                    <h2 className="text-xl font-bold">{GRADE_LEVEL_LABELS[gradeLevel]}</h2>
                  </div>

                  {/* Subheaders - Scholarship Types */}
                  <div className="space-y-6 pl-4">
                    {SCHOLARSHIP_TYPES.map((scholarshipType) => {
                      const students = getStudentsByGradeLevelAndScholarship(gradeLevel, scholarshipType);
                      
                      if (students.length === 0) return null;

                      return (
                        <div key={scholarshipType} className="space-y-2">
                          <div className="bg-muted px-4 py-2 rounded-md">
                            <h3 className="text-lg font-semibold text-primary">
                              {scholarshipType} Scholarship ({students.length} student{students.length !== 1 ? 's' : ''})
                            </h3>
                          </div>
                          <div className="overflow-x-auto border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="font-bold">Student No.</TableHead>
                                  <TableHead className="font-bold">Last Name</TableHead>
                                  <TableHead className="font-bold">First Name</TableHead>
                                  <TableHead className="font-bold">M.I.</TableHead>
                                  <TableHead className="font-bold">Year Level</TableHead>
                                  <TableHead className="font-bold text-right">Tuition</TableHead>
                                  <TableHead className="font-bold text-right">Other Fees</TableHead>
                                  <TableHead className="font-bold text-right">Misc.</TableHead>
                                  <TableHead className="font-bold text-right">Lab</TableHead>
                                  <TableHead className="font-bold text-right">Total Fees</TableHead>
                                  <TableHead className="font-bold text-right">Subsidy</TableHead>
                                  <TableHead className="font-bold text-right">% Subsidy</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {students.map((student) => {
                                  const fees = student.fees[0];
                                  const totalFees = fees ? calculateTotalFees(fees) : 0;
                                  
                                  return (
                                    <TableRow key={student.id}>
                                      <TableCell className="font-medium">{student.studentNo}</TableCell>
                                      <TableCell className="font-medium">{student.lastName}</TableCell>
                                      <TableCell>{student.firstName}</TableCell>
                                      <TableCell>{student.middleInitial || '-'}</TableCell>
                                      <TableCell>{student.yearLevel}</TableCell>
                                      <TableCell className="text-right">
                                        {fees ? formatCurrency(Number(fees.tuitionFee)) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {fees ? formatCurrency(Number(fees.otherFee)) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {fees ? formatCurrency(Number(fees.miscellaneousFee)) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {fees ? formatCurrency(Number(fees.laboratoryFee)) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right font-semibold">
                                        {formatCurrency(totalFees)}
                                      </TableCell>
                                      <TableCell className="text-right text-green-600 font-semibold">
                                        {fees ? formatCurrency(Number(fees.amountSubsidy)) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Badge variant="secondary">
                                          {fees ? `${Number(fees.percentSubsidy).toFixed(2)}%` : '-'}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {detailedStudents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No students with scholarships found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
