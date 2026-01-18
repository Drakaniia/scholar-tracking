'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileSpreadsheet,
  ArrowLeft,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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
  JUNIOR_HIGH: 'Junior High School',
  SENIOR_HIGH: 'Senior High School',
  COLLEGE: 'College',
};

const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'];
const SCHOLARSHIP_TYPES = ['PAED', 'CHED', 'LGU'];

export default function ReportsPage() {
  const router = useRouter();
  const [detailedStudents, setDetailedStudents] = useState<DetailedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchDetailedView() {
      try {
        const res = await fetch('/api/dashboard/detailed');
        const json = await res.json();
        if (json.success) {
          setDetailedStudents(json.data);
        }
      } catch (error) {
        console.error('Error fetching detailed view:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDetailedView();
  }, []);

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

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      GRADE_LEVELS.forEach((gradeLevel) => {
        const worksheetData: (string | number)[][] = [];
        
        // Add grade level header
        worksheetData.push([GRADE_LEVEL_LABELS[gradeLevel]]);
        worksheetData.push([]); // Empty row

        SCHOLARSHIP_TYPES.forEach((scholarshipType) => {
          const students = getStudentsByGradeLevelAndScholarship(gradeLevel, scholarshipType);
          
          if (students.length > 0) {
            // Add scholarship type header
            worksheetData.push([`${scholarshipType} Scholarship`]);
            
            // Add column headers
            worksheetData.push([
              'Last Name',
              'First Name',
              'M.I.',
              'Year Level',
              'Tuition Fee',
              'Other Fee',
              'Miscellaneous',
              'Laboratory Fees',
              'Total Fees',
              'Amount Subsidy',
              '% Subsidy',
              'Scholarship'
            ]);

            // Add student data
            students.forEach((student) => {
              const fees = student.fees[0];
              const totalFees = fees ? calculateTotalFees(fees) : 0;
              const amountSubsidy = fees ? Number(fees.amountSubsidy) : 0;
              const percentSubsidy = totalFees > 0 ? (amountSubsidy / totalFees) * 100 : 0;
              
              worksheetData.push([
                student.lastName,
                student.firstName,
                student.middleInitial || '-',
                student.yearLevel,
                fees ? Number(fees.tuitionFee) : 0,
                fees ? Number(fees.otherFee) : 0,
                fees ? Number(fees.miscellaneousFee) : 0,
                fees ? Number(fees.laboratoryFee) : 0,
                totalFees,
                amountSubsidy,
                parseFloat(percentSubsidy.toFixed(2)),
                student.scholarship?.scholarshipName || 'N/A'
              ]);
            });

            // Add summary row
            const totalTuition = students.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].tuitionFee) : 0), 0);
            const totalOther = students.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].otherFee) : 0), 0);
            const totalMisc = students.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].miscellaneousFee) : 0), 0);
            const totalLab = students.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].laboratoryFee) : 0), 0);
            const totalAllFees = students.reduce((sum, s) => sum + (s.fees[0] ? calculateTotalFees(s.fees[0]) : 0), 0);
            const totalSubsidy = students.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].amountSubsidy) : 0), 0);
            const avgPercentSubsidy = totalAllFees > 0 ? (totalSubsidy / totalAllFees) * 100 : 0;

            worksheetData.push([
              `TOTAL (${students.length} students)`,
              '',
              '',
              '',
              totalTuition,
              totalOther,
              totalMisc,
              totalLab,
              totalAllFees,
              totalSubsidy,
              parseFloat(avgPercentSubsidy.toFixed(2)),
              ''
            ]);

            worksheetData.push([]); // Empty row between scholarship types
          }
        });

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Set column widths
        worksheet['!cols'] = [
          { wch: 15 }, // Last Name
          { wch: 15 }, // First Name
          { wch: 5 },  // M.I.
          { wch: 12 }, // Year Level
          { wch: 14 }, // Tuition Fee
          { wch: 12 }, // Other Fee
          { wch: 15 }, // Miscellaneous
          { wch: 15 }, // Laboratory Fees
          { wch: 14 }, // Total Fees
          { wch: 15 }, // Amount Subsidy
          { wch: 12 }, // % Subsidy
          { wch: 30 }, // Scholarship
        ];

        // Apply styles to headers
        let currentRow = 0;
        SCHOLARSHIP_TYPES.forEach((scholarshipType) => {
          const students = getStudentsByGradeLevelAndScholarship(gradeLevel, scholarshipType);
          
          if (students.length > 0) {
            // Find the scholarship type header row
            while (currentRow < worksheetData.length) {
              if (worksheetData[currentRow][0] === `${scholarshipType} Scholarship`) {
                // Style scholarship type header
                const scholarshipHeaderCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
                if (!worksheet[scholarshipHeaderCell]) worksheet[scholarshipHeaderCell] = { t: 's', v: `${scholarshipType} Scholarship` };
                worksheet[scholarshipHeaderCell].s = {
                  fill: { fgColor: { rgb: scholarshipType === 'PAED' ? 'FFE699' : scholarshipType === 'CHED' ? 'C6E0B4' : 'B4C7E7' } },
                  font: { bold: true, sz: 12 },
                  alignment: { horizontal: 'left', vertical: 'center' }
                };

                // Style column headers (next row)
                const headerRow = currentRow + 1;
                for (let col = 0; col < 12; col++) {
                  const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
                  if (!worksheet[cellAddress]) continue;
                  worksheet[cellAddress].s = {
                    fill: { fgColor: { rgb: '4472C4' } },
                    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: {
                      top: { style: 'thin', color: { rgb: '000000' } },
                      bottom: { style: 'thin', color: { rgb: '000000' } },
                      left: { style: 'thin', color: { rgb: '000000' } },
                      right: { style: 'thin', color: { rgb: '000000' } }
                    }
                  };
                }

                // Style total row
                const totalRow = headerRow + students.length + 1;
                for (let col = 0; col < 12; col++) {
                  const cellAddress = XLSX.utils.encode_cell({ r: totalRow, c: col });
                  if (!worksheet[cellAddress]) continue;
                  worksheet[cellAddress].s = {
                    fill: { fgColor: { rgb: 'F2F2F2' } },
                    font: { bold: true, sz: 10 },
                    alignment: { horizontal: col >= 4 ? 'right' : 'left', vertical: 'center' }
                  };
                }

                currentRow = totalRow + 2; // Move past total row and empty row
                break;
              }
              currentRow++;
            }
          }
        });

        // Style grade level header
        const gradeLevelCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
        if (!worksheet[gradeLevelCell]) worksheet[gradeLevelCell] = { t: 's', v: GRADE_LEVEL_LABELS[gradeLevel] };
        worksheet[gradeLevelCell].s = {
          fill: { fgColor: { rgb: '203864' } },
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
          alignment: { horizontal: 'left', vertical: 'center' }
        };

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, GRADE_LEVEL_LABELS[gradeLevel]);
      });

      // Generate Excel file
      XLSX.writeFile(workbook, `Scholarship_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setExporting(false);
    }
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
        title="Comprehensive Scholarship Report"
        description="Detailed view of all students with scholarships organized by grade level and scholarship type"
      >
        <div className="flex gap-2">
          <Button 
            onClick={() => router.push('/')} 
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button 
            onClick={exportToExcel} 
            disabled={exporting}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
        </div>
      </PageHeader>

      {/* Summary Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Students</div>
            <div className="text-2xl font-bold">{detailedStudents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Fees</div>
            <div className="text-2xl font-bold">
              {formatCurrency(
                detailedStudents.reduce((sum, s) => 
                  sum + (s.fees[0] ? calculateTotalFees(s.fees[0]) : 0), 0
                )
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Subsidies</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                detailedStudents.reduce((sum, s) => 
                  sum + (s.fees[0] ? Number(s.fees[0].amountSubsidy) : 0), 0
                )
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Average Subsidy %</div>
            <div className="text-2xl font-bold">
              {(
                detailedStudents.reduce((sum, s) => 
                  sum + (s.fees[0] ? Number(s.fees[0].percentSubsidy) : 0), 0
                ) / detailedStudents.length
              ).toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Detailed Student Scholarship Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="GRADE_SCHOOL" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              {GRADE_LEVELS.map((level) => (
                <TabsTrigger key={level} value={level}>
                  {GRADE_LEVEL_LABELS[level]}
                </TabsTrigger>
              ))}
            </TabsList>

            {GRADE_LEVELS.map((gradeLevel) => (
              <TabsContent key={gradeLevel} value={gradeLevel}>
                <div className="space-y-6">
                  {SCHOLARSHIP_TYPES.map((scholarshipType) => {
                    const students = getStudentsByGradeLevelAndScholarship(gradeLevel, scholarshipType);
                    
                    if (students.length === 0) return null;

                    return (
                      <div key={scholarshipType} className="space-y-2">
                        <h3 className="text-lg font-semibold text-primary">
                          {scholarshipType} Scholarship
                        </h3>
                        <div className="overflow-x-auto border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="font-bold">Last Name</TableHead>
                                <TableHead className="font-bold">First Name</TableHead>
                                <TableHead className="font-bold">M.I.</TableHead>
                                <TableHead className="font-bold">Year Level</TableHead>
                                <TableHead className="font-bold text-right">Tuition Fee</TableHead>
                                <TableHead className="font-bold text-right">Other Fee</TableHead>
                                <TableHead className="font-bold text-right">Miscellaneous</TableHead>
                                <TableHead className="font-bold text-right">Laboratory</TableHead>
                                <TableHead className="font-bold text-right">Total Fees</TableHead>
                                <TableHead className="font-bold text-right">Subsidy</TableHead>
                                <TableHead className="font-bold text-right">% Subsidy</TableHead>
                                <TableHead className="font-bold">Scholarship</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.map((student) => {
                                const fees = student.fees[0];
                                const totalFees = fees ? calculateTotalFees(fees) : 0;
                                const amountSubsidy = fees ? Number(fees.amountSubsidy) : 0;
                                const percentSubsidy = totalFees > 0 ? (amountSubsidy / totalFees) * 100 : 0;
                                
                                return (
                                  <TableRow key={student.id}>
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
                                      {fees ? formatCurrency(amountSubsidy) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Badge variant="secondary">
                                        {fees ? `${percentSubsidy.toFixed(2)}%` : '-'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {student.scholarship?.scholarshipName || 'N/A'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {/* Summary Row */}
                              <TableRow className="bg-muted/30 font-bold">
                                <TableCell colSpan={4}>TOTAL ({students.length} students)</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    students.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].tuitionFee) : 0), 0)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    students.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].otherFee) : 0), 0)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    students.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].miscellaneousFee) : 0), 0)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    students.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].laboratoryFee) : 0), 0)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    students.reduce((sum, s) => sum + (s.fees[0] ? calculateTotalFees(s.fees[0]) : 0), 0)
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-green-600">
                                  {formatCurrency(
                                    students.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].amountSubsidy) : 0), 0)
                                  )}
                                </TableCell>
                                <TableCell colSpan={2}></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
