'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface PreviewStudent {
    firstName: string;
    lastName: string;
    middleInitial?: string;
    program: string;
    gradeLevel: string;
    yearLevel: string;
    status: string;
    birthDate?: string;
}

interface ImportError {
    row: number;
    data: PreviewStudent;
    errors: string[];
}

interface ImportPreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    data: {
        total: number;
        valid: number;
        invalid: number;
        validStudents: PreviewStudent[];
        errors: ImportError[];
    };
    isLoading?: boolean;
}

export function ImportPreviewDialog({
    isOpen,
    onClose,
    onConfirm,
    data,
    isLoading = false,
}: ImportPreviewDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Import Preview</DialogTitle>
                    <DialogDescription>
                        Review the parsed data before importing. {data.invalid} out of {data.total} rows have errors.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {/* Summary */}
                    <div className="flex gap-4">
                        <div className="flex-1 rounded-lg bg-green-50 p-4 border border-green-200">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="font-semibold text-green-900">Valid</span>
                            </div>
                            <p className="text-2xl font-bold text-green-700 mt-1">{data.valid}</p>
                        </div>
                        <div className="flex-1 rounded-lg bg-red-50 p-4 border border-red-200">
                            <div className="flex items-center gap-2">
                                <XCircle className="h-5 w-5 text-red-600" />
                                <span className="font-semibold text-red-900">Invalid</span>
                            </div>
                            <p className="text-2xl font-bold text-red-700 mt-1">{data.invalid}</p>
                        </div>
                        <div className="flex-1 rounded-lg bg-blue-50 p-4 border border-blue-200">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold text-blue-900">Total</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-700 mt-1">{data.total}</p>
                        </div>
                    </div>

                    {/* Valid Students Preview */}
                    {data.validStudents.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">Valid Students (First 10)</h4>
                            <div className="h-48 overflow-y-auto rounded-md border">
                                <div className="p-4">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-2">Name</th>
                                                <th className="text-left py-2 px-2">Program</th>
                                                <th className="text-left py-2 px-2">Grade</th>
                                                <th className="text-left py-2 px-2">Year</th>
                                                <th className="text-left py-2 px-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.validStudents.slice(0, 10).map((student, idx) => (
                                                <tr key={idx} className="border-b hover:bg-muted/50">
                                                    <td className="py-2 px-2">
                                                        {student.lastName}, {student.firstName}
                                                        {student.middleInitial && ` ${student.middleInitial}`}
                                                    </td>
                                                    <td className="py-2 px-2">{student.program}</td>
                                                    <td className="py-2 px-2">{student.gradeLevel}</td>
                                                    <td className="py-2 px-2">{student.yearLevel}</td>
                                                    <td className="py-2 px-2">
                                                        <Badge
                                                            variant={
                                                                student.status === 'Active'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {student.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {data.validStudents.length > 10 && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            ... and {data.validStudents.length - 10} more
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Errors */}
                    {data.errors.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">Errors (First 20)</h4>
                            <div className="h-48 overflow-y-auto rounded-md border">
                                <div className="p-4 space-y-3">
                                    {data.errors.slice(0, 20).map((error, idx) => (
                                        <div key={idx} className="rounded-lg bg-red-50 border border-red-200 p-3">
                                            <div className="flex items-start gap-2">
                                                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="font-semibold text-red-900">Row {error.row}</div>
                                                    <div className="text-sm text-red-700 mt-1">
                                                        {error.errors.join(', ')}
                                                    </div>
                                                    <div className="text-xs text-red-600 mt-1 bg-red-100/50 p-2 rounded">
                                                        Data: {JSON.stringify(error.data, null, 2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {data.errors.length > 20 && (
                                        <p className="text-xs text-muted-foreground">
                                            ... and {data.errors.length - 20} more errors
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={onConfirm} 
                        disabled={data.valid === 0 || isLoading}
                    >
                        {isLoading ? 'Importing...' : `Import ${data.valid} Students`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}