'use client';

import { FileDown, FileSpreadsheet, FileText, Sheet } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ExportFormat = 'pdf' | 'csv' | 'xlsx';
type ButtonVariant =
  | 'default'
  | 'gradient'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

interface ExportButtonProps {
  endpoint: string;
  filename: string;
  formats?: ExportFormat[];
  label?: string;
  variant?: ButtonVariant;
  className?: string;
  extraItems?: Array<{
    endpoint: string;
    filename: string;
    format: ExportFormat;
    label: string;
  }>;
}

const FORMAT_META = {
  pdf: {
    label: 'Export as PDF',
    Icon: FileText,
  },
  xlsx: {
    label: 'Export as Excel',
    Icon: Sheet,
  },
  csv: {
    label: 'Export as CSV',
    Icon: FileSpreadsheet,
  },
} as const;

export function ExportButton({
  endpoint,
  filename,
  formats = ['pdf', 'xlsx', 'csv'],
  label = 'Export',
  variant = 'gradient',
  className,
  extraItems = [],
}: ExportButtonProps) {
  const handleExport = async (
    format: ExportFormat,
    exportEndpoint = endpoint,
    exportFilename = filename
  ) => {
    try {
      if (!exportEndpoint) {
        toast.error('Export endpoint not configured');
        return;
      }

      toast.loading(`Generating ${format.toUpperCase()} export...`);

      const exportUrl = new URL(exportEndpoint, window.location.origin);
      exportUrl.searchParams.set('format', format);

      const res = await fetch(exportUrl.toString(), { credentials: 'include' });

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportFilename}.${format}`;
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

  if (formats.length === 1 && extraItems.length === 0) {
    const format = formats[0];
    const { Icon } = FORMAT_META[format];

    return (
      <Button variant={variant} onClick={() => handleExport(format)} className={className}>
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} className={className}>
          <FileDown className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {extraItems.map((item) => {
          const { Icon } = FORMAT_META[item.format];
          return (
            <DropdownMenuItem
              key={`${item.endpoint}-${item.format}`}
              onClick={() => handleExport(item.format, item.endpoint, item.filename)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </DropdownMenuItem>
          );
        })}
        {formats.map((format) => {
          const { Icon, label: formatLabel } = FORMAT_META[format];
          return (
            <DropdownMenuItem key={format} onClick={() => handleExport(format)}>
              <Icon className="mr-2 h-4 w-4" />
              {formatLabel}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
