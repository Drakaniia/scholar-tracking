'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import {
  SCHOLARSHIP_TYPES,
  EXTERNAL_CATEGORIES,
  CreateScholarshipInput,
} from '@/types';

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
  const form = useForm<CreateScholarshipInput>({
    defaultValues: {
      name: '',
      description: '',
      type: 'Internal',
      category: '',
      amount: 0,
      eligibility: '',
      isActive: true,
      ...defaultValues,
    },
  });

  const watchType = form.watch('type');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Scholarship Name</Label>
        <Input
          id="name"
          {...form.register('name', { required: true })}
          placeholder="Academic Excellence Award"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={watchType}
            onValueChange={(value: 'Internal' | 'External') => {
              form.setValue('type', value);
              if (value === 'Internal') {
                form.setValue('category', '');
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHOLARSHIP_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {watchType === 'External' && (
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.watch('category') || ''}
              onValueChange={value => form.setValue('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXTERNAL_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₱)</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          {...form.register('amount', { valueAsNumber: true })}
          placeholder="10000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          placeholder="Scholarship for students with excellent academic performance..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eligibility">Eligibility Requirements</Label>
        <Textarea
          id="eligibility"
          {...form.register('eligibility')}
          placeholder="Minimum GWA of 1.5, enrolled in any degree program..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="applicationStart">Application Start</Label>
          <Input
            id="applicationStart"
            type="date"
            {...form.register('applicationStart')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="applicationEnd">Application End</Label>
          <Input
            id="applicationEnd"
            type="date"
            {...form.register('applicationEnd')}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
}
