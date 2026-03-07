'use client';

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

interface ImportButtonProps {
    onImportComplete?: () => void;
}

export function ImportButton({ onImportComplete }: ImportButtonProps) {
    const csvInputRef = useRef<HTMLInputElement>(null);
    const xlsxInputRef = useRef<HTMLInputElement>(null);

    const handleImport = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            toast.loading('Importing students...');
            
            const res = await fetch('/api/students/import', {
                method: 'POST',
                body: formData,
            });

            const json = await res.json();
            toast.dismiss();

            if (json.success) {
                const { imported, failed, total } = json.data;
                toast.success(
                    `Import complete: ${imported} imported, ${failed} failed out of ${total} total`,
                    { duration: 5000 }
                );
                
                if (json.data.errors && json.data.errors.length > 0) {
                    console.log('Import errors:', json.data.errors);
                }
                
                onImportComplete?.();
            } else {
                toast.error(json.error || 'Import failed');
            }
        } catch (error) {
            console.error('Import error:', error);
            toast.dismiss();
            toast.error('Failed to import students');
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

        handleImport(file);
        
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
        </>
    );
}
