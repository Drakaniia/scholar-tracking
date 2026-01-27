'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, FileSpreadsheet, FileText, Sheet } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
    endpoint: string;
    filename: string;
}

export function ExportButton({ endpoint, filename }: ExportButtonProps) {
    const handleExport = async (format: 'pdf' | 'csv' | 'xlsx') => {
        try {
            if (!endpoint) {
                toast.error('Export endpoint not configured');
                return;
            }

            toast.loading(`Generating ${format.toUpperCase()} export...`);

            const res = await fetch(`${endpoint}?format=${format}`);

            if (!res.ok) {
                throw new Error('Export failed');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.dismiss();
            toast.success(`${format.toUpperCase()} exported successfully`);
        } catch (error) {
            console.error('Export error:', error);
            toast.dismiss();
            toast.error('Failed to export');
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    <Sheet className="mr-2 h-4 w-4" />
                    Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as CSV
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
