'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AlertTriangle, CalendarClock, GraduationCap, Settings } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useActiveAcademicYear } from '@/hooks/use-queries';
import { getAcademicYearPromotionReminder } from '@/lib/academic-year-promotion-reminder';

const PROMOTION_QUEUE_HREF = '/registry#promotion-queue';
const ACADEMIC_YEAR_SETTINGS_HREF = '/settings';

function getReminderStorageKey(academicYearId: number, triggerDateKey: string) {
  return `scholartrack:promotion-reminder:${academicYearId}:${triggerDateKey}`;
}

function hasDismissedReminder(storageKey: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.sessionStorage.getItem(storageKey) === 'dismissed';
  } catch {
    return false;
  }
}

function getDueCopy(daysPastDue: number) {
  if (daysPastDue === 0) {
    return 'Due today';
  }

  if (daysPastDue === 1) {
    return '1 day overdue';
  }

  return `${daysPastDue} days overdue`;
}

export function PromotionReminderDialog() {
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();
  const { data: activeAcademicYearData } = useActiveAcademicYear();
  const [dismissedStorageKey, setDismissedStorageKey] = useState<string | null>(null);

  const isAdmin = !authLoading && user?.role === 'ADMIN';
  const activeAcademicYear = activeAcademicYearData?.success
    ? activeAcademicYearData.data || null
    : null;

  const reminder = useMemo(
    () => getAcademicYearPromotionReminder(activeAcademicYear),
    [activeAcademicYear]
  );

  const storageKey =
    reminder && reminder.isDue
      ? getReminderStorageKey(reminder.academicYearId, reminder.triggerDateKey)
      : null;

  const isDismissed =
    !!storageKey && (dismissedStorageKey === storageKey || hasDismissedReminder(storageKey));
  const open =
    isAdmin &&
    !!reminder?.isDue &&
    !!storageKey &&
    !isDismissed &&
    !pathname?.startsWith('/registry');

  const dismissReminder = () => {
    if (storageKey) {
      try {
        window.sessionStorage.setItem(storageKey, 'dismissed');
      } catch {
        // A blocked storage write should not prevent dismissing the modal.
      }
    }

    setDismissedStorageKey(storageKey);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      dismissReminder();
      return;
    }
  };

  if (!isAdmin || !reminder?.isDue) {
    return null;
  }

  const reasonCopy =
    reminder.reason === 'promotion-date'
      ? 'The saved promotion date has arrived.'
      : 'The active academic year has ended.';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden border-0 bg-white p-0 shadow-2xl sm:max-w-xl">
        <div className="border-b border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#ecfeff_62%,#f8fafc_100%)] p-6">
          <DialogHeader className="gap-4 text-left">
            <div className="flex items-start justify-between gap-4 pr-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-700 shadow-sm">
                <CalendarClock className="h-6 w-6" />
              </div>
              <Badge className="border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100">
                {getDueCopy(reminder.daysPastDue)}
              </Badge>
            </div>
            <div>
              <DialogTitle className="text-2xl leading-tight text-slate-950">
                Start academic year promotion
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-slate-600">
                {reasonCopy} Promotion is manual, so an admin must review the Promotion Level queue
                and confirm which students continue.
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium uppercase text-slate-500">Academic Year</p>
              <p className="mt-1 font-semibold text-slate-950">{reminder.academicYear}</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
              <p className="text-xs font-medium uppercase text-amber-700">Reminder Date</p>
              <p className="mt-1 font-semibold text-amber-950">{reminder.triggerDateLabel}</p>
            </div>
            <div className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-3">
              <p className="text-xs font-medium uppercase text-cyan-700">Mode</p>
              <p className="mt-1 font-semibold text-cyan-950">Manual</p>
            </div>
          </div>

          <div className="flex gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              Select students who will continue at Bosco/FSE. Students left out of the confirmed
              cohort are archived by the promotion flow.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <Button type="button" variant="outline" onClick={dismissReminder}>
            Remind me later
          </Button>
          <Button asChild variant="outline" onClick={dismissReminder}>
            <Link href={ACADEMIC_YEAR_SETTINGS_HREF}>
              <Settings className="h-4 w-4" />
              Academic Year Settings
            </Link>
          </Button>
          <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Link href={PROMOTION_QUEUE_HREF} onClick={dismissReminder}>
              <GraduationCap className="h-4 w-4" />
              Open Promotion Level
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
