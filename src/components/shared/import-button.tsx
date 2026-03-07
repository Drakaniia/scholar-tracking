'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileUp, FileSpreadsheet, Sheet } from 'lucide-react';
import { toast } from 'sonner';
import { useRef } from 'react';
import { ImportPreviewDialog } from './import-preview-dialog';

interface ImportButtonProps {
    onImportComplete?: () => void;
}

interface PreviewData {
    total: number;
    valid: number;
    invalid: number;
    validStudents: ImportRow[];
    errors: ImportError[];
}

interface ImportRow {
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
    data: ImportRow;
    errors: string[];
}

export function ImportButton({ onImportComplete }: ImportButtonProps) {
    const csvInputRef = useRef<HTMLInputElement>(null);
    const xlsxInputRef = useRef<HTMLInputElement>(null);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const handlePreview = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            toast.loading('Parsing file...');
            
            const res = await fetch('/api/students/import/preview', {
                method: 'POST',
                body: formData,
            });

            const json = await res.json();
            toast.dismiss();

            if (json.success) {
                setPreviewData(json.data);
                setIsPreviewOpen(true);
            } else {
                toast.error(json.error || 'Failed to parse file');
            }
        } catch (error) {
            console.error('Preview error:', error);
            toast.dismiss();
            toast.error('Failed to parse file');
        }
    };

    const handleConfirmImport = async () => {
        if (!previewData) return;

        try {
            setIsImporting(true);
            toast.loading('Importing students...');
            
            const res = await fetch('/api/students/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    validStudents: previewData.validStudents,
                }),
            });

            const json = await res.json();
            toast.dismiss();

            if (json.success) {
                const { imported } = json.data;
                toast.success(
                    `Import complete: ${imported} students imported successfully`,
                    { duration: 5000 }
                );
                
                setIsPreviewOpen(false);
                setPreviewData(null);
                onImportComplete?.();
            } else {
                toast.error(json.error || 'Import failed');
            }
        } catch (error) {
            console.error('Import error:', error);
            toast.dismiss();
            toast.error('Failed to import students');
        } finally {
            setIsImporting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        handlePreview(file);
        
        // Reset input
        e.target.value = '';
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="gradient">
                        <FileUp className="mr-2 h-4 w-4" />
                        Import
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => csvInputRef.current?.click()}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Import from CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => xlsxInputRef.current?.click()}>
                        <Sheet className="mr-2 h-4 w-4" />
                        Import from Excel
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
            />
            <input
                ref={xlsxInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
            />

            {previewData && (
                <ImportPreviewDialog
                    isOpen={isPreviewOpen}
                    onClose={() => {
                        setIsPreviewOpen(false);
                        setPreviewData(null);
                    }}
                    onConfirm={handleConfirmImport}
                    data={previewData}
                    isLoading={isImporting}
                />
            )}
        </>
    );
}
