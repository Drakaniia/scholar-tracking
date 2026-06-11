import type { AcademicYear } from '@/types';

const MANILA_TIME_ZONE = 'Asia/Manila';
const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type AcademicYearPromotionStatus = 'completed' | 'disabled' | 'due' | 'pending';

export type AcademicYearPromotionReminderReason = 'promotion-date' | 'academic-year-ended';

export interface AcademicYearPromotionReminder {
  academicYearId: number;
  academicYear: string;
  isDue: boolean;
  reason: AcademicYearPromotionReminderReason;
  triggerDate: Date;
  triggerDateKey: string;
  triggerDateLabel: string;
  daysPastDue: number;
}

function parseDateValue(value: string | Date | null | undefined) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalizedValue = value.trim();
  const dateInputMatch = normalizedValue.match(DATE_INPUT_PATTERN);
  const date = dateInputMatch
    ? new Date(
        Date.UTC(
          Number(dateInputMatch[1]),
          Number(dateInputMatch[2]) - 1,
          Number(dateInputMatch[3])
        )
      )
    : new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getDatePartsInManila(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return null;
  }

  return { year, month, day };
}

function getDateKeyInManila(date: Date) {
  const parts = getDatePartsInManila(date);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : null;
}

function dateKeyToUtcDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysToDateKey(dateKey: string, days: number) {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function differenceInDateKeys(startDateKey: string, endDateKey: string) {
  const start = dateKeyToUtcDate(startDateKey).getTime();
  const end = dateKeyToUtcDate(endDateKey).getTime();
  return Math.max(0, Math.round((end - start) / MS_PER_DAY));
}

export function formatPromotionReminderDate(date: Date) {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: MANILA_TIME_ZONE,
  }).format(date);
}

function getReminderTrigger(academicYear: AcademicYear) {
  const promotionDate = parseDateValue(academicYear.promotionDate);
  if (promotionDate) {
    const dateKey = getDateKeyInManila(promotionDate);
    return dateKey
      ? {
          reason: 'promotion-date' as const,
          date: promotionDate,
          dateKey,
        }
      : null;
  }

  const endDate = parseDateValue(academicYear.endDate);
  if (!endDate) {
    return null;
  }

  const endDateKey = getDateKeyInManila(endDate);
  if (!endDateKey) {
    return null;
  }

  const dateKey = addDaysToDateKey(endDateKey, 1);
  return {
    reason: 'academic-year-ended' as const,
    date: dateKeyToUtcDate(dateKey),
    dateKey,
  };
}

export function getAcademicYearPromotionReminder(
  academicYear: AcademicYear | null | undefined,
  now = new Date()
): AcademicYearPromotionReminder | null {
  if (!academicYear || academicYear.promotionProcessedAt) {
    return null;
  }

  const trigger = getReminderTrigger(academicYear);
  const todayKey = getDateKeyInManila(now);
  if (!trigger || !todayKey) {
    return null;
  }

  const isDue = trigger.dateKey <= todayKey;

  return {
    academicYearId: academicYear.id,
    academicYear: academicYear.year,
    isDue,
    reason: trigger.reason,
    triggerDate: trigger.date,
    triggerDateKey: trigger.dateKey,
    triggerDateLabel: formatPromotionReminderDate(trigger.date),
    daysPastDue: isDue ? differenceInDateKeys(trigger.dateKey, todayKey) : 0,
  };
}

export function getAcademicYearPromotionStatus(
  academicYear: AcademicYear,
  now = new Date()
): AcademicYearPromotionStatus {
  if (academicYear.promotionProcessedAt) {
    return 'completed';
  }

  const reminder = getAcademicYearPromotionReminder(academicYear, now);
  if (!reminder) {
    return 'disabled';
  }

  return reminder.isDue ? 'due' : 'pending';
}
