'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Send, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SCHOLARSHIP_TYPES } from '@/types';

interface Scholarship {
  id: number;
  name: string;
  description: string | null;
  type: 'Internal' | 'External';
  category: string | null;
  amount: number;
  eligibility: string | null;
  applicationStart: string | null;
  applicationEnd: string | null;
  applied: boolean;
}

export default function WebScholarshipsPage() {
  const router = useRouter();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showApplied, setShowApplied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] =
    useState<Scholarship | null>(null);
  const [remarks, setRemarks] = useState('');
  const [applying, setApplying] = useState(false);

  const fetchScholarships = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
      params.append('showApplied', String(showApplied));
      params.append('limit', '100');

      const res = await fetch(`/api/web/scholarships?${params}`);
      const json = await res.json();
      if (json.success) {
        setScholarships(json.data);
      } else if (res.status === 401) {
        router.push('/web/login');
      }
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      toast.error('Failed to fetch scholarships');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, showApplied, router]);

  useEffect(() => {
    fetchScholarships();
  }, [fetchScholarships]);

  const handleApply = async () => {
    if (!selectedScholarship) return;

    setApplying(true);
    try {
      const res = await fetch('/api/web/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scholarshipId: selectedScholarship.id,
          remarks,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Application submitted successfully!');
        setDialogOpen(false);
        setSelectedScholarship(null);
        setRemarks('');
        fetchScholarships();
      } else {
        toast.error(json.error || 'Application failed');
      }
    } catch (error) {
      console.error('Error applying for scholarship:', error);
      toast.error('Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const openApplyDialog = (scholarship: Scholarship) => {
    setSelectedScholarship(scholarship);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Available Scholarships</h1>
        <p className="text-muted-foreground mt-2">
          Browse and apply for scholarship opportunities
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search scholarships..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {SCHOLARSHIP_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={showApplied ? 'applied' : 'available'}
              onValueChange={v => setShowApplied(v === 'applied')}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : scholarships.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
          <p>No scholarships found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {scholarships.map(scholarship => (
            <Card key={scholarship.id} className="flex flex-col">
              <CardContent className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <Badge variant="outline">{scholarship.type}</Badge>
                  {scholarship.applied && (
                    <Badge className="bg-green-100 text-green-800">
                      <Check className="h-3 w-3 mr-1" />
                      Applied
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {scholarship.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {scholarship.description || 'No description available'}
                </p>
                {scholarship.eligibility && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Eligibility:
                    </p>
                    <p className="text-sm">{scholarship.eligibility}</p>
                  </div>
                )}
                {scholarship.applicationStart && scholarship.applicationEnd && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Application Period:
                    </p>
                    <p className="text-sm">
                      {formatDate(scholarship.applicationStart)} -{' '}
                      {formatDate(scholarship.applicationEnd)}
                    </p>
                  </div>
                )}
                <div className="mt-auto pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(scholarship.amount)}
                    </p>
                    {!scholarship.applied && (
                      <Button
                        size="sm"
                        onClick={() => openApplyDialog(scholarship)}
                      >
                        Apply Now
                        <Send className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Scholarship</DialogTitle>
            <DialogDescription>
              {selectedScholarship?.name} -{' '}
              {formatCurrency(selectedScholarship?.amount || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">Additional Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                placeholder="Add any additional information about your application..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={applying}>
              {applying ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
