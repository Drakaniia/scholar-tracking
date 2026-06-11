'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import {
  Activity,
  AlertCircle,
  Archive,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  GraduationCap,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Monitor,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Shield,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clientCache, fetchWithCache } from '@/lib/cache';
import { getPromotionDecisionOptions, isStudentTransitionDecision } from '@/lib/promotion-decisions';
import { formatCurrency } from '@/lib/utils';
import {
  GRADE_LEVEL_LABELS,
  SCHOLARSHIP_TERMS,
  SCHOLARSHIP_TERM_LABELS,
  STUDENT_TRANSITION_DECISION_LABELS,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
} from '@/types';
import type { StudentTransitionDecision } from '@/types';

const ARCHIVED_ITEMS_PAGE_SIZE = 10;

type ArchivedDeleteKind = 'student' | 'scholarship';

interface ArchivedDeleteTarget {
  kind: ArchivedDeleteKind;
  ids: number[];
  label: string;
}

interface PermanentDeleteResponse {
  success: boolean;
  data?: {
    deletedCount: number;
  };
  error?: string;
}

interface SettingsConsoleUser {
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

function SettingsConsoleHeaderSkeleton() {
  return (
    <section className="overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700" />
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-5 w-36 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 sm:h-9" />
            <Skeleton className="h-5 w-full max-w-xl" />
          </div>
        </div>
        <Skeleton className="h-9 w-full rounded-md sm:w-40" />
      </div>
    </section>
  );
}

function SettingsConsoleHeader({ currentUser }: { currentUser: SettingsConsoleUser | null }) {
  const fullName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ');
  const displayName = fullName || currentUser?.username || 'Administrator';

  return (
    <section className="overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700" />
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5 bg-emerald-50 text-emerald-700">
              <Shield className="h-3.5 w-3.5" />
              Admin Console
            </Badge>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              {displayName}
              {currentUser?.role ? ` - ${currentUser.role}` : ''}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
            Manage users, sessions, audit logs, archives, and academic year controls.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full justify-center sm:w-auto">
          <Link href="/" prefetch={true}>
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </section>
  );
}

function SettingsTableBodySkeleton({ widths, rows = 6 }: { widths: string[]; rows?: number }) {
  return (
    <TableBody>
      {[...Array(rows)].map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {widths.map((width, columnIndex) => (
            <TableCell key={`${rowIndex}-${columnIndex}`}>
              <Skeleton className={width} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

function UserManagementCardSkeleton() {
  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <SettingsTableBodySkeleton
              widths={[
                'h-5 w-32',
                'h-5 w-40',
                'h-5 w-56',
                'h-10 w-[140px] rounded-md',
                'h-6 w-20 rounded-full',
                'h-5 w-36',
                'ml-auto h-8 w-24 rounded-md',
              ]}
            />
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <SettingsConsoleHeaderSkeleton />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-5xl rounded-md" />
        <UserManagementCardSkeleton />
      </div>
    </div>
  );
}

function SessionsTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Device/Browser</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <SettingsTableBodySkeleton
          widths={[
            'h-8 w-44',
            'h-6 w-20 rounded-full',
            'h-6 w-28 rounded-md',
            'h-5 w-48',
            'h-5 w-36',
            'h-5 w-36',
            'ml-auto h-8 w-16 rounded-md',
          ]}
        />
      </Table>
    </div>
  );
}

function ProfileInformationSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="pt-2">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

function AcademicYearSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-md" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Academic Year</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Promotion Date</TableHead>
                <TableHead>Promotion Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <SettingsTableBodySkeleton
              rows={4}
              widths={[
                'h-5 w-32',
                'h-6 w-20 rounded-full',
                'h-5 w-24',
                'h-5 w-24',
                'h-5 w-32',
                'h-6 w-20 rounded-full',
                'h-6 w-20 rounded-full',
                'ml-auto h-8 w-24 rounded-md',
              ]}
            />
          </Table>
        </div>
      </div>
    </div>
  );
}

function AuditLogsTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <SettingsTableBodySkeleton
          widths={[
            'h-5 w-36',
            'h-8 w-40',
            'h-6 w-24 rounded-full',
            'h-8 w-32',
            'h-6 w-28 rounded-md',
            'h-5 w-24',
          ]}
        />
      </Table>
    </div>
  );
}

function ArchivedItemsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="mb-4 h-7 w-44" />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Grade Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <SettingsTableBodySkeleton
              rows={4}
              widths={[
                'h-5 w-44',
                'h-5 w-40',
                'h-6 w-24 rounded-full',
                'h-6 w-20 rounded-full',
                'ml-auto h-8 w-24 rounded-md',
              ]}
            />
          </Table>
        </div>
      </div>
      <div>
        <Skeleton className="mb-4 h-7 w-52" />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scholarship Name</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <SettingsTableBodySkeleton
              rows={4}
              widths={[
                'h-5 w-48',
                'h-5 w-36',
                'h-6 w-24 rounded-full',
                'h-6 w-20 rounded-full',
                'h-5 w-28',
                'ml-auto h-8 w-24 rounded-md',
              ]}
            />
          </Table>
        </div>
      </div>
    </div>
  );
}

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  lastLogin: string | null;
  createdAt: string;
}

interface SessionData {
  id: string;
  userId: number;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface CreateUserFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'STAFF' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface EditUserFormData {
  firstName: string;
  lastName: string;
  email: string;
}

interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
}

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface AcademicYearFormData {
  year: string;
  startDate: string;
  endDate: string;
  semester: string;
  promotionDate: string;
}

interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  resourceType: string | null;
  resourceId: number | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Student {
  id: number;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  program: string;
  gradeLevel: string;
  yearLevel: string;
  status: string;
  isArchived: boolean;
}

const MANILA_TIME_ZONE = 'Asia/Manila';

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

function formatDateForInput(value: string | null | undefined) {
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts = getDatePartsInManila(date);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

function getDefaultAcademicYearFormData(now = new Date()): AcademicYearFormData {
  const parts = getDatePartsInManila(now);
  const currentYear = parts ? Number(parts.year) : now.getFullYear();
  const currentMonth = parts ? Number(parts.month) : now.getMonth() + 1;
  const startYear = currentMonth >= 6 ? currentYear : currentYear - 1;
  const endYear = startYear + 1;
  const endDate = `${endYear}-05-31`;

  return {
    year: `${startYear}-${endYear}`,
    startDate: `${startYear}-06-01`,
    endDate,
    semester: '1ST',
    promotionDate: endDate,
  };
}

const initialFormData: CreateUserFormData = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  role: 'STAFF',
  status: 'ACTIVE',
};

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateUserFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateUserFormData, string>>>({});

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination state
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(25);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(0);

  // Edit user state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<EditUserFormData>({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditUserFormData, string>>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Delete user state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset password state
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPasswordFormData, setResetPasswordFormData] = useState<ResetPasswordFormData>({
    newPassword: '',
    confirmPassword: '',
  });
  const [resetPasswordErrors, setResetPasswordErrors] = useState<
    Partial<Record<keyof ResetPasswordFormData, string>>
  >({});
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Session management state
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);

  // Profile state
  const [profileData, setProfileData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof ProfileFormData, string>>
  >({});
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Change password state
  const [changePasswordData, setChangePasswordData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changePasswordErrors, setChangePasswordErrors] = useState<
    Partial<Record<keyof ChangePasswordFormData, string>>
  >({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [auditLogTotal, setAuditLogTotal] = useState(0);
  const [auditLogTotalPages, setAuditLogTotalPages] = useState(0);
  const [auditLogFilters, setAuditLogFilters] = useState({
    action: 'ALL',
    resourceType: 'ALL',
    startDate: '',
    endDate: '',
  });
  const [auditLogFilterOptions, setAuditLogFilterOptions] = useState<{
    actions: string[];
    resourceTypes: string[];
  }>({ actions: [], resourceTypes: [] });

  // Archived items state
  const [archivedStudents, setArchivedStudents] = useState<Student[]>([]);
  const [archivedScholarships, setArchivedScholarships] = useState<Scholarship[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [unarchivingItem, setUnarchivingItem] = useState<string | null>(null);
  const [selectedArchivedStudentIds, setSelectedArchivedStudentIds] = useState<number[]>([]);
  const [selectedArchivedScholarshipIds, setSelectedArchivedScholarshipIds] = useState<number[]>(
    []
  );
  const [archiveDeleteTarget, setArchiveDeleteTarget] = useState<ArchivedDeleteTarget | null>(
    null
  );
  const [isDeletingArchivedItem, setIsDeletingArchivedItem] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentTotalPages, setStudentTotalPages] = useState(0);
  const [scholarshipPage, setScholarshipPage] = useState(1);
  const [scholarshipTotal, setScholarshipTotal] = useState(0);
  const [scholarshipTotalPages, setScholarshipTotalPages] = useState(0);

  // Academic Year state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [academicYearTotal, setAcademicYearTotal] = useState(0);
  const [academicYearTotalPages, setAcademicYearTotalPages] = useState(0);
  const [academicYearPage] = useState(1);
  const [isSubmittingAcademicYear, setIsSubmittingAcademicYear] = useState(false);
  const [isAutoPromoting] = useState(false);
  const [isUndoingPromotion, setIsUndoingPromotion] = useState(false);
  const [isSavingTransitionDecisions, setIsSavingTransitionDecisions] = useState(false);
  const [transitionDecisions, setTransitionDecisions] = useState<
    Record<number, StudentTransitionDecision>
  >({});
  const [promotionPreview, setPromotionPreview] = useState<PromotionPreview | null>(null);
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false);
  const [promotionRun, setPromotionRun] = useState<PromotionRun | null>(null);
  const [activeAcademicYear, setActiveAcademicYear] = useState<AcademicYear | null>(null);
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<number | null>(null);
  const [academicYearFormData, setAcademicYearFormData] = useState<AcademicYearFormData>(() =>
    getDefaultAcademicYearFormData()
  );
  const announcedPromotionRunsRef = useRef<Set<number>>(new Set());

  interface AcademicYear {
    id: number;
    year: string;
    startDate: string;
    endDate: string;
    semester: string;
    isActive: boolean;
    promotionDate: string | null;
    promotionProcessedAt: string | null;
  }

  interface PromotionPreview {
    activeAcademicYear: AcademicYear | null;
    latestRun: PromotionRun | null;
    totalStudents: number;
    preview: Array<{
      id: number;
      firstName: string;
      lastName: string;
      gradeLevel: string;
      yearLevel: string;
      nextGradeLevel: string | null;
      nextYearLevel: string | null;
      nextProgram: string | null;
      nextTermType: string | null;
      action: 'PROMOTE' | 'GRADUATE' | 'RETAIN' | 'SEPARATE' | 'SKIP';
      transitionDecision: StudentTransitionDecision | null;
      requiresDecision: boolean;
      reason?: string;
    }>;
  }

  interface PromotionRun {
    id: number;
    academicYearId: number;
    academicYear: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVERTED';
    source: string;
    requestedBy: number | null;
    totalStudents: number;
    promotedCount: number;
    graduatedCount: number;
    skippedCount: number;
    errorCount: number;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
  }

  const formatDate = (value: string | null) => {
    if (!value) return 'Not set';
    return new Date(value).toLocaleDateString();
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return 'Not yet';
    return new Date(value).toLocaleString();
  };

  const isPromotionRunActive = useCallback(
    (run: PromotionRun | null) => run?.status === 'PENDING' || run?.status === 'PROCESSING',
    []
  );

  const getPromotionRunBadge = (run: PromotionRun) => {
    if (run.status === 'REVERTED') {
      return {
        label: 'Undone',
        className: 'bg-gray-600 text-white',
      };
    }

    if (run.status === 'FAILED') {
      return {
        label: 'Failed',
        className: 'bg-red-600 text-white',
      };
    }

    if (run.status === 'COMPLETED') {
      return {
        label: run.errorCount > 0 ? 'Completed with issues' : 'Completed',
        className: run.errorCount > 0 ? 'bg-amber-500 text-white' : 'bg-green-600 text-white',
      };
    }

    return {
      label: 'Processing',
      className: 'bg-blue-600 text-white',
    };
  };

  const getPromotionRunProcessedCount = (run: PromotionRun) =>
    run.promotedCount + run.graduatedCount + run.skippedCount + run.errorCount;

  const syncAcademicYearSettingsForm = useCallback(
    (defaultAcademicYear: AcademicYear | null, years: AcademicYear[] = []) => {
      const fallbackFormData = getDefaultAcademicYearFormData();
      const existingDefaultAcademicYear =
        defaultAcademicYear ||
        years.find((academicYear) => academicYear.year === fallbackFormData.year) ||
        null;

      setActiveAcademicYear(defaultAcademicYear);
      setActiveAcademicYearId(existingDefaultAcademicYear?.id || null);
      setAcademicYearFormData(
        existingDefaultAcademicYear
          ? {
              year: existingDefaultAcademicYear.year,
              startDate: formatDateForInput(existingDefaultAcademicYear.startDate),
              endDate: formatDateForInput(existingDefaultAcademicYear.endDate),
              semester: existingDefaultAcademicYear.semester || '1ST',
              promotionDate: formatDateForInput(existingDefaultAcademicYear.promotionDate),
            }
          : fallbackFormData
      );
    },
    []
  );

  const getPromotionStatus = (academicYear: AcademicYear) => {
    const latestRunForYear = promotionRun?.academicYearId === academicYear.id ? promotionRun : null;
    if (latestRunForYear && isPromotionRunActive(latestRunForYear)) {
      return {
        label: 'Processing',
        className: 'bg-blue-600 text-white',
      };
    }

    if (academicYear.promotionProcessedAt) {
      return {
        label: 'Completed',
        className: 'bg-green-600 text-white',
      };
    }

    if (!academicYear.promotionDate) {
      return {
        label: 'Disabled',
        className: '',
      };
    }

    if (new Date(academicYear.promotionDate) <= new Date()) {
      return {
        label: 'Due',
        className: 'bg-amber-500 text-white',
      };
    }

    return {
      label: 'Pending',
      className: 'bg-blue-600 text-white',
    };
  };

  interface Scholarship {
    id: number;
    scholarshipName: string;
    sponsor: string;
    type: string;
    source: string;
    amount: number;
    requirements: string | null;
    status: string;
    isArchived: boolean;
  }

  interface ArchivedStudentsResponse {
    success: boolean;
    data: Student[];
    page: number;
    total: number;
    totalPages: number;
    error?: string;
  }

  interface ArchivedScholarshipsResponse {
    success: boolean;
    data: Scholarship[];
    page: number;
    total: number;
    totalPages: number;
    error?: string;
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = useCallback(
    async (page = userPage) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: userLimit.toString(),
        });

        if (searchQuery) {
          params.append('search', searchQuery);
        }
        if (roleFilter !== 'ALL') {
          params.append('role', roleFilter);
        }
        if (statusFilter !== 'ALL') {
          params.append('status', statusFilter);
        }

        const url = `/api/users?${params}`;
        const data = await fetchWithCache<{
          success: boolean;
          data: User[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        }>(
          url,
          undefined,
          1 * 60 * 1000 // 1 minute cache
        );

        if (data.success) {
          setUsers(data.data);
          setUserPage(data.pagination.page);
          setUserTotal(data.pagination.total);
          setUserTotalPages(data.pagination.totalPages);
        } else {
          toast.error('Failed to load users');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    },
    [userPage, userLimit, searchQuery, roleFilter, statusFilter]
  );

  const applyUserFilters = () => {
    setUserPage(1);
    fetchUsers(1);
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
        credentials: 'include',
      });
      const result = await res.json();

      if (result.success) {
        toast.success('User role updated successfully');
        // Invalidate cache
        clientCache.invalidate('/api/users:{}');
        fetchUsers();
      } else {
        toast.error(result.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusChange = async (userId: number, newStatus: string) => {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });
      const result = await res.json();

      if (result.success) {
        toast.success('User status updated successfully');
        // Invalidate cache
        clientCache.invalidate('/api/users:{}');
        fetchUsers();
      } else {
        toast.error(result.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setUpdating(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateUserFormData, string>> = {};

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          status: formData.status,
        }),
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('User created successfully');
        // Invalidate cache
        clientCache.invalidate('/api/users:{}');
        // Reset form and close dialog
        setFormData(initialFormData);
        setErrors({});
        setIsCreateDialogOpen(false);
        fetchUsers();
      } else {
        toast.error(result.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: keyof CreateUserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
  };

  // Edit user handlers
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
    setEditErrors({});
    setIsEditDialogOpen(true);
  };

  const validateEditForm = (): boolean => {
    const newErrors: Partial<Record<keyof EditUserFormData, string>> = {};

    if (!editFormData.firstName) {
      newErrors.firstName = 'First name is required';
    }
    if (!editFormData.lastName) {
      newErrors.lastName = 'Last name is required';
    }
    if (!editFormData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditUser = async () => {
    if (!validateEditForm() || !editingUser) return;

    setIsEditing(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('User updated successfully');
        clientCache.invalidate('/api/users:{}');
        setIsEditDialogOpen(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        toast.error(result.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsEditing(false);
    }
  };

  // Delete user handlers
  const openDeleteDialog = (user: User) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('User deleted successfully');
        clientCache.invalidate('/api/users:{}');
        setIsDeleteDialogOpen(false);
        setDeletingUser(null);
        fetchUsers();
      } else {
        toast.error(result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset password handlers
  const openResetPasswordDialog = (user: User) => {
    setResetPasswordUser(user);
    setResetPasswordFormData({ newPassword: '', confirmPassword: '' });
    setResetPasswordErrors({});
    setIsResetPasswordDialogOpen(true);
  };

  const validateResetPasswordForm = (): boolean => {
    const newErrors: Partial<Record<keyof ResetPasswordFormData, string>> = {};

    if (!resetPasswordFormData.newPassword || resetPasswordFormData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (resetPasswordFormData.newPassword !== resetPasswordFormData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setResetPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateResetPasswordForm() || !resetPasswordUser) return;

    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPasswordFormData.newPassword }),
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Password reset successfully');
        setIsResetPasswordDialogOpen(false);
        setResetPasswordUser(null);
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Session management handlers
  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/sessions', { credentials: 'include' });
      const result = await res.json();

      if (result.success) {
        setSessions(result.data);
      } else {
        toast.error('Failed to load sessions');
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Session revoked successfully');
        fetchSessions();
      } else {
        toast.error(result.error || 'Failed to revoke session');
      }
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session');
    } finally {
      setRevokingSession(null);
    }
  };

  // Profile handlers
  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch('/api/profile', { credentials: 'include' });
      const result = await res.json();

      if (result.success) {
        setProfileData({
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          email: result.data.email,
        });
      } else {
        toast.error('Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const validateProfileForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProfileFormData, string>> = {};

    if (!profileData.firstName) {
      newErrors.firstName = 'First name is required';
    }
    if (!profileData.lastName) {
      newErrors.lastName = 'Last name is required';
    }
    if (!profileData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setProfileErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateProfileForm()) return;

    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const validateChangePasswordForm = (): boolean => {
    const newErrors: Partial<Record<keyof ChangePasswordFormData, string>> = {};

    if (!changePasswordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!changePasswordData.newPassword || changePasswordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setChangePasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateChangePasswordForm()) return;

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: changePasswordData.currentPassword,
          newPassword: changePasswordData.newPassword,
        }),
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Password changed successfully');
        setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Audit log handlers
  const fetchAuditLogFilterOptions = async () => {
    try {
      const res = await fetch('/api/audit-logs/filter-options', { credentials: 'include' });
      const result = await res.json();

      if (result.success) {
        setAuditLogFilterOptions(result.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    setLoadingAuditLogs(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (auditLogFilters.action !== 'ALL') {
        params.append('action', auditLogFilters.action);
      }
      if (auditLogFilters.resourceType !== 'ALL') {
        params.append('resourceType', auditLogFilters.resourceType);
      }
      if (auditLogFilters.startDate) {
        params.append('startDate', auditLogFilters.startDate);
      }
      if (auditLogFilters.endDate) {
        params.append('endDate', auditLogFilters.endDate);
      }

      const res = await fetch(`/api/audit-logs?${params}`, { credentials: 'include' });
      const result = await res.json();

      if (result.success) {
        setAuditLogs(result.data);
        setAuditLogPage(result.pagination.page);
        setAuditLogTotal(result.pagination.total);
        setAuditLogTotalPages(result.pagination.totalPages);
      } else {
        toast.error('Failed to load audit logs');
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const handleAuditLogFilterChange = (key: string, value: string) => {
    setAuditLogFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyAuditLogFilters = () => {
    setAuditLogPage(1);
    fetchAuditLogs(1);
  };

  const clearAuditLogFilters = () => {
    setAuditLogFilters({
      action: 'ALL',
      resourceType: 'ALL',
      startDate: '',
      endDate: '',
    });
    setAuditLogPage(1);
    fetchAuditLogs(1);
  };

  // Fetch archived students
  const fetchArchivedStudents = async (page = 1) => {
    setLoadingArchived(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ARCHIVED_ITEMS_PAGE_SIZE.toString(),
        archived: 'true',
      });

      const response = await fetch(`/api/students?${params}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const result: ArchivedStudentsResponse = await response.json();

      if (result.success) {
        const visibleIds = new Set(result.data.map((student) => student.id));
        setArchivedStudents(result.data);
        setStudentPage(result.page);
        setStudentTotal(result.total);
        setStudentTotalPages(result.totalPages);
        setSelectedArchivedStudentIds((selectedIds) =>
          selectedIds.filter((studentId) => visibleIds.has(studentId))
        );
      } else {
        toast.error('Failed to load archived students');
      }
    } catch (error) {
      console.error('Error fetching archived students:', error);
      toast.error('Failed to load archived students');
    } finally {
      setLoadingArchived(false);
    }
  };

  // Fetch archived scholarships
  const fetchArchivedScholarships = async (page = 1) => {
    setLoadingArchived(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ARCHIVED_ITEMS_PAGE_SIZE.toString(),
        archived: 'true',
      });

      const response = await fetch(`/api/scholarships?${params}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const result: ArchivedScholarshipsResponse = await response.json();

      if (result.success) {
        const visibleIds = new Set(result.data.map((scholarship) => scholarship.id));
        setArchivedScholarships(result.data);
        setScholarshipPage(result.page);
        setScholarshipTotal(result.total);
        setScholarshipTotalPages(result.totalPages);
        setSelectedArchivedScholarshipIds((selectedIds) =>
          selectedIds.filter((scholarshipId) => visibleIds.has(scholarshipId))
        );
      } else {
        toast.error('Failed to load archived scholarships');
      }
    } catch (error) {
      console.error('Error fetching archived scholarships:', error);
      toast.error('Failed to load archived scholarships');
    } finally {
      setLoadingArchived(false);
    }
  };

  const getNextArchivedPageAfterDelete = (
    currentVisibleCount: number,
    deletedIds: number[],
    currentPage: number
  ) => (deletedIds.length >= currentVisibleCount && currentPage > 1 ? currentPage - 1 : currentPage);

  const openArchiveDeleteDialog = (
    kind: ArchivedDeleteKind,
    ids: number[],
    label: string
  ) => {
    if (ids.length === 0) {
      return;
    }

    setArchiveDeleteTarget({ kind, ids, label });
  };

  // Handle unarchive student
  const handleUnarchiveStudent = async (studentId: number) => {
    setUnarchivingItem(`student-${studentId}`);
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unarchive' }),
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        const nextPage =
          archivedStudents.length === 1 && studentPage > 1 ? studentPage - 1 : studentPage;
        const nextTotal = Math.max(studentTotal - 1, 0);

        setArchivedStudents((students) => students.filter((student) => student.id !== studentId));
        setStudentPage(nextPage);
        setStudentTotal(nextTotal);
        setStudentTotalPages(Math.ceil(nextTotal / ARCHIVED_ITEMS_PAGE_SIZE));
        setSelectedArchivedStudentIds((selectedIds) =>
          selectedIds.filter((selectedId) => selectedId !== studentId)
        );

        toast.success('Student unarchived successfully');
        void fetchArchivedStudents(nextPage);
      } else {
        toast.error(result.error || 'Failed to unarchive student');
      }
    } catch (error) {
      console.error('Error unarchiving student:', error);
      toast.error('Failed to unarchive student');
    } finally {
      setUnarchivingItem(null);
    }
  };

  const handlePermanentDeleteStudents = async (studentIds: number[]) => {
    setIsDeletingArchivedItem(true);
    try {
      const response = await fetch('/api/students/permanent-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: studentIds }),
        credentials: 'include',
      });
      const result: PermanentDeleteResponse = await response.json();

      if (response.ok && result.success) {
        const deletedCount = result.data?.deletedCount ?? studentIds.length;
        const nextPage = getNextArchivedPageAfterDelete(
          archivedStudents.length,
          studentIds,
          studentPage
        );
        const nextTotal = Math.max(studentTotal - deletedCount, 0);
        const deletedIdSet = new Set(studentIds);

        setArchivedStudents((students) =>
          students.filter((student) => !deletedIdSet.has(student.id))
        );
        setSelectedArchivedStudentIds((selectedIds) =>
          selectedIds.filter((selectedId) => !deletedIdSet.has(selectedId))
        );
        setStudentPage(nextPage);
        setStudentTotal(nextTotal);
        setStudentTotalPages(Math.ceil(nextTotal / ARCHIVED_ITEMS_PAGE_SIZE));

        toast.success(
          `${deletedCount} archived ${deletedCount === 1 ? 'student' : 'students'} deleted`
        );
        void fetchArchivedStudents(nextPage);
      } else {
        toast.error(result.error || 'Failed to delete archived students');
      }
    } catch (error) {
      console.error('Error deleting archived students:', error);
      toast.error('Failed to delete archived students');
    } finally {
      setIsDeletingArchivedItem(false);
    }
  };

  // Handle unarchive scholarship
  const handleUnarchiveScholarship = async (scholarshipId: number) => {
    setUnarchivingItem(`scholarship-${scholarshipId}`);
    try {
      const response = await fetch(`/api/scholarships/${scholarshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unarchive' }),
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        const nextPage =
          archivedScholarships.length === 1 && scholarshipPage > 1
            ? scholarshipPage - 1
            : scholarshipPage;
        const nextTotal = Math.max(scholarshipTotal - 1, 0);

        setArchivedScholarships((scholarships) =>
          scholarships.filter((scholarship) => scholarship.id !== scholarshipId)
        );
        setScholarshipPage(nextPage);
        setScholarshipTotal(nextTotal);
        setScholarshipTotalPages(Math.ceil(nextTotal / ARCHIVED_ITEMS_PAGE_SIZE));
        setSelectedArchivedScholarshipIds((selectedIds) =>
          selectedIds.filter((selectedId) => selectedId !== scholarshipId)
        );

        toast.success('Scholarship unarchived successfully');
        void fetchArchivedScholarships(nextPage);
      } else {
        toast.error(result.error || 'Failed to unarchive scholarship');
      }
    } catch (error) {
      console.error('Error unarchiving scholarship:', error);
      toast.error('Failed to unarchive scholarship');
    } finally {
      setUnarchivingItem(null);
    }
  };

  const handlePermanentDeleteScholarships = async (scholarshipIds: number[]) => {
    setIsDeletingArchivedItem(true);
    try {
      const response = await fetch('/api/scholarships/permanent-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: scholarshipIds }),
        credentials: 'include',
      });
      const result: PermanentDeleteResponse = await response.json();

      if (response.ok && result.success) {
        const deletedCount = result.data?.deletedCount ?? scholarshipIds.length;
        const nextPage = getNextArchivedPageAfterDelete(
          archivedScholarships.length,
          scholarshipIds,
          scholarshipPage
        );
        const nextTotal = Math.max(scholarshipTotal - deletedCount, 0);
        const deletedIdSet = new Set(scholarshipIds);

        setArchivedScholarships((scholarships) =>
          scholarships.filter((scholarship) => !deletedIdSet.has(scholarship.id))
        );
        setSelectedArchivedScholarshipIds((selectedIds) =>
          selectedIds.filter((selectedId) => !deletedIdSet.has(selectedId))
        );
        setScholarshipPage(nextPage);
        setScholarshipTotal(nextTotal);
        setScholarshipTotalPages(Math.ceil(nextTotal / ARCHIVED_ITEMS_PAGE_SIZE));

        toast.success(
          `${deletedCount} archived ${
            deletedCount === 1 ? 'scholarship' : 'scholarships'
          } deleted`
        );
        void fetchArchivedScholarships(nextPage);
      } else {
        toast.error(result.error || 'Failed to delete archived scholarships');
      }
    } catch (error) {
      console.error('Error deleting archived scholarships:', error);
      toast.error('Failed to delete archived scholarships');
    } finally {
      setIsDeletingArchivedItem(false);
    }
  };

  const handleConfirmArchiveDelete = async () => {
    if (!archiveDeleteTarget) {
      return;
    }

    if (archiveDeleteTarget.kind === 'student') {
      await handlePermanentDeleteStudents(archiveDeleteTarget.ids);
    } else {
      await handlePermanentDeleteScholarships(archiveDeleteTarget.ids);
    }

    setArchiveDeleteTarget(null);
  };

  // Academic Year functions
  const handleIncomingPromotionRun = useCallback((run: PromotionRun | null, announce = false) => {
    setPromotionRun(run);

    if (!run || !announce || (run.status !== 'COMPLETED' && run.status !== 'FAILED')) {
      return;
    }

    if (announcedPromotionRunsRef.current.has(run.id)) {
      return;
    }

    announcedPromotionRunsRef.current.add(run.id);

    if (run.status === 'COMPLETED') {
      toast.success(
        `Promotion complete: ${run.promotedCount} promoted, ${run.graduatedCount} graduated`
      );
    } else {
      toast.error(run.errorMessage || 'Promotion failed. Please review the status in Settings.');
    }
  }, []);

  const fetchAcademicYears = useCallback(
    async (page: number) => {
      setLoadingAcademicYears(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        });
        const [listRes, activeRes] = await Promise.all([
          fetch(`/api/academic-years?${params}`, { credentials: 'include' }),
          fetch('/api/academic-years?action=active', { credentials: 'include' }),
        ]);
        const [listResult, activeResult] = await Promise.all([listRes.json(), activeRes.json()]);

        if (listResult.success) {
          const years = listResult.data || [];
          setAcademicYears(years);
          syncAcademicYearSettingsForm(activeResult.success ? activeResult.data : null, years);
          setAcademicYearTotal(listResult.total);
          setAcademicYearTotalPages(listResult.totalPages);
        } else {
          toast.error(listResult.error || 'Failed to fetch academic years');
        }

        if (!activeResult.success) {
          toast.error(activeResult.error || 'Failed to fetch active academic year');
        }
      } catch (error) {
        console.error('Error fetching academic years:', error);
        toast.error('Failed to fetch academic years');
      } finally {
        setLoadingAcademicYears(false);
      }
    },
    [syncAcademicYearSettingsForm]
  );

  const fetchPromotionPreview = useCallback(async () => {
    try {
      const res = await fetch('/api/academic-years/auto-promote', { credentials: 'include' });
      const result = await res.json();

      if (result.success) {
        setPromotionPreview(result.data);
        const initialDecisions: Record<number, StudentTransitionDecision> = {};
        result.data.preview.forEach(
          (student: { id: number; transitionDecision: StudentTransitionDecision | null }) => {
            if (isStudentTransitionDecision(student.transitionDecision)) {
              initialDecisions[student.id] = student.transitionDecision;
            }
          }
        );
        setTransitionDecisions(initialDecisions);
        handleIncomingPromotionRun(result.data.latestRun || null);
      } else {
        toast.error(result.error || 'Failed to fetch promotion preview');
      }
    } catch (error) {
      console.error('Error fetching promotion preview:', error);
      toast.error('Failed to fetch promotion preview');
    }
  }, [handleIncomingPromotionRun]);

  const fetchPromotionRunStatus = useCallback(
    async (runId?: number, options?: { announce?: boolean }) => {
      try {
        const params = new URLSearchParams();
        if (runId) {
          params.set('runId', runId.toString());
        } else {
          params.set('statusOnly', 'true');
        }

        const res = await fetch(`/api/academic-years/auto-promote?${params.toString()}`, {
          credentials: 'include',
        });
        const result = await res.json();

        if (result.success) {
          const run = result.data.run || result.data.latestRun || null;
          handleIncomingPromotionRun(run, options?.announce);
          return run as PromotionRun | null;
        }

        toast.error(result.error || 'Failed to fetch promotion status');
      } catch (error) {
        console.error('Error fetching promotion status:', error);
        toast.error('Failed to fetch promotion status');
      }

      return null;
    },
    [handleIncomingPromotionRun]
  );

  useEffect(() => {
    if (!promotionRun || !isPromotionRunActive(promotionRun)) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      const latestRun = await fetchPromotionRunStatus(promotionRun.id, { announce: true });

      if (latestRun && !isPromotionRunActive(latestRun)) {
        fetchAcademicYears(academicYearPage);
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [
    academicYearPage,
    fetchAcademicYears,
    fetchPromotionRunStatus,
    isPromotionRunActive,
    promotionRun,
  ]);

  const handleAcademicYearFormChange = (
    field: keyof typeof academicYearFormData,
    value: string
  ) => {
    setAcademicYearFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveAcademicYearSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingAcademicYear(true);

    const selectedAcademicYear = activeAcademicYearId
      ? academicYears.find((academicYear) => academicYear.id === activeAcademicYearId) ||
        activeAcademicYear
      : null;
    const data = {
      year: academicYearFormData.year,
      startDate: academicYearFormData.startDate,
      endDate: academicYearFormData.endDate,
      semester: academicYearFormData.semester || selectedAcademicYear?.semester || '1ST',
      promotionDate: academicYearFormData.promotionDate || null,
      isActive: true,
    };

    try {
      const url = activeAcademicYearId
        ? `/api/academic-years?id=${activeAcademicYearId}`
        : '/api/academic-years';

      const res = await fetch(url, {
        method: activeAcademicYearId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Academic year settings saved successfully');
        fetchAcademicYears(academicYearPage);
      } else {
        toast.error(result.error || 'Failed to save academic year');
      }
    } catch (error) {
      console.error('Error saving academic year:', error);
      toast.error('Failed to save academic year');
    } finally {
      setIsSubmittingAcademicYear(false);
    }
  };

  const handleDeleteAcademicYear = async (id: number) => {
    if (!confirm('Are you sure you want to delete this academic year? This cannot be undone.')) {
      return;
    }

    setIsSubmittingAcademicYear(true);
    try {
      const res = await fetch(`/api/academic-years?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Academic year deleted successfully');
        fetchAcademicYears(academicYearPage);
      } else {
        toast.error(result.error || 'Failed to delete academic year');
      }
    } catch (error) {
      console.error('Error deleting academic year:', error);
      toast.error('Failed to delete academic year');
    } finally {
      setIsSubmittingAcademicYear(false);
    }
  };

  const handleSetActiveAcademicYear = async (id: number, isActive: boolean) => {
    try {
      const res = await fetch(`/api/academic-years?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Active academic year updated successfully');
        fetchAcademicYears(academicYearPage);
      } else {
        toast.error(result.error || 'Failed to update active academic year');
      }
    } catch (error) {
      console.error('Error updating active academic year:', error);
      toast.error('Failed to update active academic year');
    }
  };

  const handleOpenPromotionDialog = async () => {
    setIsPromotionDialogOpen(true);
    await fetchPromotionPreview();
  };

  const handleTransitionDecisionChange = (
    studentId: number,
    decision: StudentTransitionDecision
  ) => {
    setTransitionDecisions((current) => ({
      ...current,
      [studentId]: decision,
    }));
  };

  const handleSaveTransitionDecisions = async () => {
    if (!promotionPreview) return;

    const decisions = promotionPreview.preview
      .filter((student) => transitionDecisions[student.id])
      .map((student) => ({
        studentId: student.id,
        decision: transitionDecisions[student.id],
      }));

    if (decisions.length === 0) {
      toast.error('Select at least one transition decision first.');
      return;
    }

    setIsSavingTransitionDecisions(true);
    try {
      const res = await fetch('/api/academic-years/auto-promote', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions }),
        credentials: 'include',
      });
      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || 'Failed to save transition decisions');
        return;
      }

      toast.success(result.message || 'Transition decisions saved');
      await fetchPromotionPreview();
    } catch (error) {
      console.error('Error saving transition decisions:', error);
      toast.error('Failed to save transition decisions');
    } finally {
      setIsSavingTransitionDecisions(false);
    }
  };

  const handleAutoPromoteStudents = async () => {
    toast.message('Use Promotion Level to select continuing students before processing promotion.');
    setIsPromotionDialogOpen(false);
    window.location.href = '/registry';
  };

  const handleUndoPromotion = async () => {
    if (
      !confirm(
        'This will restore students from the last promotion backup and allow this academic year to be promoted again. Continue?'
      )
    ) {
      return;
    }

    setIsUndoingPromotion(true);
    try {
      const res = await fetch('/api/academic-years/auto-promote', {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await res.json();

      if (result.success) {
        toast.success(result.message || 'Last promotion undone successfully');
        setPromotionRun(null);
        setPromotionPreview(null);
        fetchAcademicYears(academicYearPage);
      } else {
        toast.error(result.error || 'Failed to undo promotion');
      }
    } catch (error) {
      console.error('Error undoing promotion:', error);
      toast.error('Failed to undo promotion');
    } finally {
      setIsUndoingPromotion(false);
    }
  };

  const activePromotionRun =
    promotionRun && activeAcademicYear?.id === promotionRun.academicYearId ? promotionRun : null;
  const isActivePromotionProcessing = isPromotionRunActive(activePromotionRun);
  const dialogPromotionRun =
    promotionRun && promotionPreview?.activeAcademicYear?.id === promotionRun.academicYearId
      ? promotionRun
      : null;
  const isDialogPromotionProcessing = isPromotionRunActive(dialogPromotionRun);
  const promotionDecisionBlockers =
    promotionPreview?.preview.filter((student) => student.requiresDecision) || [];
  const hasPromotionDecisionBlockers = promotionDecisionBlockers.length > 0;
  const canStartDialogPromotion = Boolean(
    promotionPreview?.activeAcademicYear &&
    !promotionPreview.activeAcademicYear.promotionProcessedAt &&
    !isDialogPromotionProcessing &&
    !hasPromotionDecisionBlockers
  );
  const canReviewDialogPromotion = Boolean(
    promotionPreview?.activeAcademicYear &&
    !promotionPreview.activeAcademicYear.promotionProcessedAt &&
    !isDialogPromotionProcessing
  );
  const canUndoPromotion = Boolean(activeAcademicYear?.promotionProcessedAt);
  const allArchivedStudentsSelected =
    archivedStudents.length > 0 && selectedArchivedStudentIds.length === archivedStudents.length;
  const allArchivedScholarshipsSelected =
    archivedScholarships.length > 0 &&
    selectedArchivedScholarshipIds.length === archivedScholarships.length;

  if (loading) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <SettingsConsoleHeader currentUser={currentUser} />

      <Tabs defaultValue="users" className="space-y-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="h-auto min-w-max justify-start rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            <TabsTrigger value="users" className="h-9 flex-none gap-2 px-3">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="h-9 flex-none gap-2 px-3"
              onClick={() => fetchSessions()}
            >
              <Monitor className="h-4 w-4" />
              Active Sessions
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="h-9 flex-none gap-2 px-3"
              onClick={() => fetchProfile()}
            >
              <UserIcon className="h-4 w-4" />
              My Profile
            </TabsTrigger>
            <TabsTrigger
              value="audit-logs"
              className="h-9 flex-none gap-2 px-3"
              onClick={() => {
                fetchAuditLogFilterOptions();
                fetchAuditLogs(1);
              }}
            >
              <FileText className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger
              value="archived"
              className="h-9 flex-none gap-2 px-3"
              onClick={() => {
                fetchArchivedStudents(1);
                fetchArchivedScholarships(1);
              }}
            >
              <Archive className="h-4 w-4" />
              Archived Items
            </TabsTrigger>
            <TabsTrigger
              value="academic-year"
              className="h-9 flex-none gap-2 px-3"
              onClick={() => {
                fetchAcademicYears(1);
                fetchPromotionRunStatus();
              }}
            >
              <GraduationCap className="h-4 w-4" />
              Academic Year
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users">
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                    if (!open) resetForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="gap-2"
                      style={{
                        background: 'linear-gradient(to right, #22c55e, #10b981, #14b8a6)',
                        boxShadow: '0 4px 15px 0 rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to the system. The user will be able to login with the
                        credentials you set.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            placeholder="Enter first name"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            className={errors.firstName ? 'border-red-500' : ''}
                          />
                          {errors.firstName && (
                            <p className="text-xs text-red-500">{errors.firstName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            placeholder="Enter last name"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            className={errors.lastName ? 'border-red-500' : ''}
                          />
                          {errors.lastName && (
                            <p className="text-xs text-red-500">{errors.lastName}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username">Username *</Label>
                        <Input
                          id="username"
                          placeholder="Enter username"
                          value={formData.username}
                          onChange={(e) => handleInputChange('username', e.target.value)}
                          className={errors.username ? 'border-red-500' : ''}
                        />
                        {errors.username && (
                          <p className="text-xs text-red-500">{errors.username}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter email address"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={errors.email ? 'border-red-500' : ''}
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="password">Password *</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            className={errors.password ? 'border-red-500' : ''}
                          />
                          {errors.password && (
                            <p className="text-xs text-red-500">{errors.password}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password *</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            className={errors.confirmPassword ? 'border-red-500' : ''}
                          />
                          {errors.confirmPassword && (
                            <p className="text-xs text-red-500">{errors.confirmPassword}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          <Select
                            value={formData.role}
                            onValueChange={(value: 'ADMIN' | 'STAFF' | 'VIEWER') =>
                              handleInputChange('role', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  {USER_ROLE_LABELS.ADMIN}
                                </div>
                              </SelectItem>
                              <SelectItem value="STAFF">{USER_ROLE_LABELS.STAFF}</SelectItem>
                              <SelectItem value="VIEWER">{USER_ROLE_LABELS.VIEWER}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') =>
                              handleInputChange('status', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">{USER_STATUS_LABELS.ACTIVE}</SelectItem>
                              <SelectItem value="INACTIVE">
                                {USER_STATUS_LABELS.INACTIVE}
                              </SelectItem>
                              <SelectItem value="SUSPENDED">
                                {USER_STATUS_LABELS.SUSPENDED}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          resetForm();
                        }}
                        disabled={isCreating}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        onClick={handleCreateUser}
                        disabled={isCreating}
                        className="gap-2"
                        style={{
                          background: 'linear-gradient(to right, #22c55e, #10b981, #14b8a6)',
                          boxShadow: '0 4px 15px 0 rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        {isCreating ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Create User
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Section */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search Input */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by username, email, or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyUserFilters()}
                      className="pl-10"
                    />
                  </div>

                  {/* Role Filter */}
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <SelectValue placeholder="Filter by role" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Roles</SelectItem>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {USER_ROLE_LABELS.ADMIN}
                        </div>
                      </SelectItem>
                      <SelectItem value="STAFF">{USER_ROLE_LABELS.STAFF}</SelectItem>
                      <SelectItem value="VIEWER">{USER_ROLE_LABELS.VIEWER}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <SelectValue placeholder="Filter by status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="ACTIVE">{USER_STATUS_LABELS.ACTIVE}</SelectItem>
                      <SelectItem value="INACTIVE">{USER_STATUS_LABELS.INACTIVE}</SelectItem>
                      <SelectItem value="SUSPENDED">{USER_STATUS_LABELS.SUSPENDED}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button onClick={applyUserFilters} size="default">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>

                {/* Results count and page size */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {users.length} of {userTotal} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Per page:</Label>
                    <Select
                      value={userLimit.toString()}
                      onValueChange={(value) => {
                        setUserLimit(parseInt(value));
                        setUserPage(1);
                        fetchUsers(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    {users.length === 0 ? 'No users found' : 'No matching users'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {users.length === 0
                      ? 'Click "Create User" to add your first user'
                      : 'Try adjusting your search or filters'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.username}
                            {user.id === currentUser?.id && (
                              <Badge variant="outline" className="ml-2">
                                You
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(user.id, value)}
                              disabled={updating === user.id || user.id === currentUser?.id}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    {USER_ROLE_LABELS.ADMIN}
                                  </div>
                                </SelectItem>
                                <SelectItem value="STAFF">{USER_ROLE_LABELS.STAFF}</SelectItem>
                                <SelectItem value="VIEWER">{USER_ROLE_LABELS.VIEWER}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.status}
                              onValueChange={(value) => handleStatusChange(user.id, value)}
                              disabled={updating === user.id || user.id === currentUser?.id}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ACTIVE">{USER_STATUS_LABELS.ACTIVE}</SelectItem>
                                <SelectItem value="INACTIVE">
                                  {USER_STATUS_LABELS.INACTIVE}
                                </SelectItem>
                                <SelectItem value="SUSPENDED">
                                  {USER_STATUS_LABELS.SUSPENDED}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                                disabled={updating === user.id}
                                className="h-8 w-8 p-0"
                                title="Edit user"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openResetPasswordDialog(user)}
                                disabled={updating === user.id}
                                className="h-8 w-8 p-0"
                                title="Reset password"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog(user)}
                                disabled={updating === user.id || user.id === currentUser?.id}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {updating === user.id && (
                                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information for {editingUser?.username}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstName">First Name *</Label>
                    <Input
                      id="edit-firstName"
                      value={editFormData.firstName}
                      onChange={(e) => {
                        setEditFormData((prev) => ({ ...prev, firstName: e.target.value }));
                        setEditErrors((prev) => ({ ...prev, firstName: undefined }));
                      }}
                      className={editErrors.firstName ? 'border-red-500' : ''}
                    />
                    {editErrors.firstName && (
                      <p className="text-xs text-red-500">{editErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-lastName">Last Name *</Label>
                    <Input
                      id="edit-lastName"
                      value={editFormData.lastName}
                      onChange={(e) => {
                        setEditFormData((prev) => ({ ...prev, lastName: e.target.value }));
                        setEditErrors((prev) => ({ ...prev, lastName: undefined }));
                      }}
                      className={editErrors.lastName ? 'border-red-500' : ''}
                    />
                    {editErrors.lastName && (
                      <p className="text-xs text-red-500">{editErrors.lastName}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => {
                      setEditFormData((prev) => ({ ...prev, email: e.target.value }));
                      setEditErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={editErrors.email ? 'border-red-500' : ''}
                  />
                  {editErrors.email && <p className="text-xs text-red-500">{editErrors.email}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isEditing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditUser}
                  disabled={isEditing}
                  style={{
                    background: 'linear-gradient(to right, #22c55e, #10b981, #14b8a6)',
                    boxShadow: '0 4px 15px 0 rgba(34, 197, 94, 0.3)',
                  }}
                >
                  {isEditing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update User'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete User Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete user <strong>{deletingUser?.username}</strong>?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> This will permanently delete:
                  </p>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                    <li>User account and credentials</li>
                    <li>All associated sessions</li>
                    <li>Audit log entries (will be preserved but user will show as deleted)</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete User
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Set a new password for {resetPasswordUser?.username}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password *</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={resetPasswordFormData.newPassword}
                    onChange={(e) => {
                      setResetPasswordFormData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }));
                      setResetPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                    }}
                    className={resetPasswordErrors.newPassword ? 'border-red-500' : ''}
                  />
                  {resetPasswordErrors.newPassword && (
                    <p className="text-xs text-red-500">{resetPasswordErrors.newPassword}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password *</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={resetPasswordFormData.confirmPassword}
                    onChange={(e) => {
                      setResetPasswordFormData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }));
                      setResetPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={resetPasswordErrors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {resetPasswordErrors.confirmPassword && (
                    <p className="text-xs text-red-500">{resetPasswordErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsResetPasswordDialogOpen(false)}
                  disabled={isResettingPassword}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={isResettingPassword}
                  style={{
                    background: 'linear-gradient(to right, #22c55e, #10b981, #14b8a6)',
                    boxShadow: '0 4px 15px 0 rgba(34, 197, 94, 0.3)',
                  }}
                >
                  {isResettingPassword ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="archived">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Archive className="h-5 w-5" />
                Archived Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <Button onClick={() => fetchArchivedStudents(1)} variant="outline">
                  View Archived Students
                </Button>
                <Button onClick={() => fetchArchivedScholarships(1)} variant="outline">
                  View Archived Scholarships
                </Button>
              </div>

              {loadingArchived ? (
                <ArchivedItemsSkeleton />
              ) : (
                <>
                  {archivedStudents.length > 0 && (
                    <div className="mb-8">
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-semibold">Archived Students</h3>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={
                            selectedArchivedStudentIds.length === 0 || isDeletingArchivedItem
                          }
                          onClick={() =>
                            openArchiveDeleteDialog(
                              'student',
                              selectedArchivedStudentIds,
                              `${selectedArchivedStudentIds.length} selected archived ${
                                selectedArchivedStudentIds.length === 1 ? 'student' : 'students'
                              }`
                            )
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete selected
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={allArchivedStudentsSelected}
                                  onCheckedChange={(checked) => {
                                    setSelectedArchivedStudentIds(
                                      checked === true
                                        ? archivedStudents.map((student) => student.id)
                                        : []
                                    );
                                  }}
                                  aria-label="Select all archived students"
                                />
                              </TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Program</TableHead>
                              <TableHead>Grade Level</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {archivedStudents.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedArchivedStudentIds.includes(student.id)}
                                    onCheckedChange={(checked) => {
                                      setSelectedArchivedStudentIds((selectedIds) => {
                                        if (checked === true) {
                                          return selectedIds.includes(student.id)
                                            ? selectedIds
                                            : [...selectedIds, student.id];
                                        }

                                        return selectedIds.filter(
                                          (selectedId) => selectedId !== student.id
                                        );
                                      });
                                    }}
                                    aria-label={`Select ${student.firstName} ${student.lastName}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {student.lastName}, {student.firstName}{' '}
                                  {student.middleInitial || ''}
                                </TableCell>
                                <TableCell>{student.program}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {
                                      GRADE_LEVEL_LABELS[
                                        student.gradeLevel as keyof typeof GRADE_LEVEL_LABELS
                                      ]
                                    }
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={student.status === 'Active' ? 'default' : 'secondary'}
                                  >
                                    {student.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUnarchiveStudent(student.id)}
                                      disabled={unarchivingItem === `student-${student.id}`}
                                    >
                                      {unarchivingItem === `student-${student.id}` ? (
                                        <>
                                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                                          Unarchiving...
                                        </>
                                      ) : (
                                        'Unarchive'
                                      )}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      disabled={isDeletingArchivedItem}
                                      onClick={() =>
                                        openArchiveDeleteDialog(
                                          'student',
                                          [student.id],
                                          `${student.firstName} ${student.lastName}`
                                        )
                                      }
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {studentTotalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            Page {studentPage} of {studentTotalPages} (Total: {studentTotal})
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchArchivedStudents(studentPage - 1)}
                              disabled={studentPage === 1 || loadingArchived}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchArchivedStudents(studentPage + 1)}
                              disabled={studentPage === studentTotalPages || loadingArchived}
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {archivedScholarships.length > 0 && (
                    <div>
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-semibold">Archived Scholarships</h3>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={
                            selectedArchivedScholarshipIds.length === 0 || isDeletingArchivedItem
                          }
                          onClick={() =>
                            openArchiveDeleteDialog(
                              'scholarship',
                              selectedArchivedScholarshipIds,
                              `${selectedArchivedScholarshipIds.length} selected archived ${
                                selectedArchivedScholarshipIds.length === 1
                                  ? 'scholarship'
                                  : 'scholarships'
                              }`
                            )
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete selected
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={allArchivedScholarshipsSelected}
                                  onCheckedChange={(checked) => {
                                    setSelectedArchivedScholarshipIds(
                                      checked === true
                                        ? archivedScholarships.map((scholarship) => scholarship.id)
                                        : []
                                    );
                                  }}
                                  aria-label="Select all archived scholarships"
                                />
                              </TableHead>
                              <TableHead>Scholarship Name</TableHead>
                              <TableHead>Sponsor</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {archivedScholarships.map((scholarship) => (
                              <TableRow key={scholarship.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedArchivedScholarshipIds.includes(
                                      scholarship.id
                                    )}
                                    onCheckedChange={(checked) => {
                                      setSelectedArchivedScholarshipIds((selectedIds) => {
                                        if (checked === true) {
                                          return selectedIds.includes(scholarship.id)
                                            ? selectedIds
                                            : [...selectedIds, scholarship.id];
                                        }

                                        return selectedIds.filter(
                                          (selectedId) => selectedId !== scholarship.id
                                        );
                                      });
                                    }}
                                    aria-label={`Select ${scholarship.scholarshipName}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {scholarship.scholarshipName}
                                </TableCell>
                                <TableCell>{scholarship.sponsor}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{scholarship.type}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      scholarship.source === 'INTERNAL' ? 'default' : 'secondary'
                                    }
                                  >
                                    {scholarship.source}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(scholarship.amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUnarchiveScholarship(scholarship.id)}
                                      disabled={
                                        unarchivingItem === `scholarship-${scholarship.id}`
                                      }
                                    >
                                      {unarchivingItem === `scholarship-${scholarship.id}` ? (
                                        <>
                                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                                          Unarchiving...
                                        </>
                                      ) : (
                                        'Unarchive'
                                      )}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      disabled={isDeletingArchivedItem}
                                      onClick={() =>
                                        openArchiveDeleteDialog(
                                          'scholarship',
                                          [scholarship.id],
                                          scholarship.scholarshipName
                                        )
                                      }
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {scholarshipTotalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            Page {scholarshipPage} of {scholarshipTotalPages} (Total:{' '}
                            {scholarshipTotal})
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchArchivedScholarships(scholarshipPage - 1)}
                              disabled={scholarshipPage === 1 || loadingArchived}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchArchivedScholarships(scholarshipPage + 1)}
                              disabled={
                                scholarshipPage === scholarshipTotalPages || loadingArchived
                              }
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {archivedStudents.length === 0 && archivedScholarships.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Archive className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p>No archived items found</p>
                      <p className="text-sm">Items you archive will appear here</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog
          open={archiveDeleteTarget !== null}
          onOpenChange={(open) => {
            if (!open && !isDeletingArchivedItem) {
              setArchiveDeleteTarget(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Delete archived {archiveDeleteTarget?.kind === 'student' ? 'student' : 'scholarship'}
              </DialogTitle>
              <DialogDescription>
                Permanently delete {archiveDeleteTarget?.label}? This removes the archived record
                and related assignment/disbursement records. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setArchiveDeleteTarget(null)}
                disabled={isDeletingArchivedItem}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleConfirmArchiveDelete()}
                disabled={isDeletingArchivedItem}
              >
                {isDeletingArchivedItem ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete permanently'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Academic Year Tab */}
        <TabsContent value="academic-year">
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <GraduationCap className="h-5 w-5" />
                  Academic Year Settings
                </CardTitle>
                <div className="flex gap-2">
                  {canUndoPromotion && (
                    <Button
                      onClick={handleUndoPromotion}
                      variant="outline"
                      className="text-xs"
                      disabled={isUndoingPromotion}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {isUndoingPromotion ? 'Undoing...' : 'Undo Last Promotion'}
                    </Button>
                  )}
                  <Button
                    onClick={handleOpenPromotionDialog}
                    variant="outline"
                    className="text-xs"
                    disabled={isAutoPromoting}
                  >
                    {isActivePromotionProcessing || isAutoPromoting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Activity className="h-4 w-4 mr-2" />
                    )}
                    {isActivePromotionProcessing ? 'View Promotion Status' : 'Review Promotion'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingAcademicYears ? (
                <AcademicYearSettingsSkeleton />
              ) : (
                <>
                  <form
                    onSubmit={handleSaveAcademicYearSettings}
                    className="space-y-4 border-b border-gray-200 pb-6"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold">Current Academic Year Settings</h3>
                        <p className="text-sm text-muted-foreground">
                          {activeAcademicYear
                            ? 'Editing the active academic year'
                            : activeAcademicYearId
                              ? 'Editing the default academic year'
                              : 'Default academic year values are ready to save'}
                        </p>
                      </div>
                      {activeAcademicYear && (
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-3 rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <p>
                        Academic year promotion is processed from Registry after an admin selects
                        the students continuing at Bosco/FSE. The saved promotion date is retained
                        as a planning reference and does not promote students automatically.
                      </p>
                    </div>

                    {activePromotionRun && (
                      <div
                        className={`flex flex-col gap-3 rounded-md border px-4 py-3 text-sm md:flex-row md:items-center md:justify-between ${
                          activePromotionRun.status === 'FAILED'
                            ? 'border-red-200 bg-red-50 text-red-950'
                            : activePromotionRun.status === 'REVERTED'
                              ? 'border-gray-200 bg-gray-50 text-gray-950'
                              : isActivePromotionProcessing
                                ? 'border-blue-200 bg-blue-50 text-blue-950'
                                : 'border-green-200 bg-green-50 text-green-950'
                        }`}
                      >
                        <div className="flex gap-3">
                          {activePromotionRun.status === 'FAILED' ? (
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                          ) : activePromotionRun.status === 'REVERTED' ? (
                            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-gray-700" />
                          ) : isActivePromotionProcessing ? (
                            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-700" />
                          ) : (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                          )}
                          <div>
                            <p className="font-medium">
                              {isActivePromotionProcessing
                                ? 'Promotion in progress'
                                : activePromotionRun.status === 'FAILED'
                                  ? 'Last promotion failed'
                                  : activePromotionRun.status === 'REVERTED'
                                    ? 'Last promotion undone'
                                    : 'Last promotion completed'}
                            </p>
                            <p className="mt-1 text-xs opacity-80">
                              {isActivePromotionProcessing
                                ? 'A previous promotion run is being processed. You can leave this page and check back later.'
                                : activePromotionRun.status === 'REVERTED'
                                  ? 'Students were restored from the last promotion run.'
                                  : `${activePromotionRun.promotedCount} promoted, ${activePromotionRun.graduatedCount} graduated, ${activePromotionRun.skippedCount} skipped.`}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleOpenPromotionDialog}
                        >
                          View Status
                        </Button>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="currentAcademicYear">Academic Year</Label>
                        <Input
                          id="currentAcademicYear"
                          value={academicYearFormData.year}
                          onChange={(e) => handleAcademicYearFormChange('year', e.target.value)}
                          placeholder="2025-2026"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentPromotionDate">Promotion Date</Label>
                        <Input
                          id="currentPromotionDate"
                          type="date"
                          value={academicYearFormData.promotionDate}
                          onChange={(e) =>
                            handleAcademicYearFormChange('promotionDate', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentSemester">Current Semester</Label>
                        <Select
                          value={academicYearFormData.semester}
                          onValueChange={(value) => handleAcademicYearFormChange('semester', value)}
                        >
                          <SelectTrigger id="currentSemester">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHOLARSHIP_TERMS.map((term) => (
                              <SelectItem key={term} value={term}>
                                {SCHOLARSHIP_TERM_LABELS[term]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentStartDate">Start Date</Label>
                        <Input
                          id="currentStartDate"
                          type="date"
                          value={academicYearFormData.startDate}
                          onChange={(e) =>
                            handleAcademicYearFormChange('startDate', e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentEndDate">End Date</Label>
                        <Input
                          id="currentEndDate"
                          type="date"
                          value={academicYearFormData.endDate}
                          onChange={(e) => handleAcademicYearFormChange('endDate', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" variant="gradient" disabled={isSubmittingAcademicYear}>
                        <Save className="h-4 w-4" />
                        {isSubmittingAcademicYear ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    <h3 className="text-base font-semibold">Academic Year History</h3>
                    {academicYears.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <GraduationCap className="mx-auto h-10 w-10 mb-2 opacity-50" />
                        <p>No academic year history yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Academic Year</TableHead>
                              <TableHead>Semester</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Promotion Date</TableHead>
                              <TableHead>Promotion Status</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {academicYears.map((ay) => (
                              <TableRow key={ay.id}>
                                <TableCell className="font-medium">{ay.year}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {SCHOLARSHIP_TERM_LABELS[
                                      ay.semester as keyof typeof SCHOLARSHIP_TERM_LABELS
                                    ] || ay.semester}
                                  </Badge>
                                </TableCell>
                                <TableCell>{new Date(ay.startDate).toLocaleDateString()}</TableCell>
                                <TableCell>{new Date(ay.endDate).toLocaleDateString()}</TableCell>
                                <TableCell>{formatDate(ay.promotionDate)}</TableCell>
                                <TableCell>
                                  {(() => {
                                    const status = getPromotionStatus(ay);
                                    return (
                                      <Badge
                                        variant={
                                          status.label === 'Disabled' ? 'secondary' : 'default'
                                        }
                                        className={status.className}
                                      >
                                        {status.label}
                                      </Badge>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {ay.isActive ? (
                                    <Badge variant="default" className="bg-green-600">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleSetActiveAcademicYear(ay.id, !ay.isActive)
                                      }
                                      disabled={ay.isActive}
                                    >
                                      {ay.isActive ? 'Active' : 'Set Active'}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteAcademicYear(ay.id)}
                                      disabled={ay.isActive}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {academicYearTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {academicYearPage} of {academicYearTotalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAcademicYears(academicYearPage - 1)}
                          disabled={academicYearPage === 1 || loadingAcademicYears}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAcademicYears(academicYearPage + 1)}
                          disabled={
                            academicYearPage === academicYearTotalPages || loadingAcademicYears
                          }
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto-Promote Dialog */}
        <Dialog open={isPromotionDialogOpen} onOpenChange={setIsPromotionDialogOpen}>
          <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isDialogPromotionProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : dialogPromotionRun?.status === 'COMPLETED' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : dialogPromotionRun?.status === 'FAILED' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : dialogPromotionRun?.status === 'REVERTED' ? (
                  <RotateCcw className="h-5 w-5 text-gray-600" />
                ) : (
                  <Activity className="h-5 w-5 text-green-600" />
                )}
                {isDialogPromotionProcessing ? 'Promotion in Progress' : 'Review Promotion'}
              </DialogTitle>
              <DialogDescription>
                Preview the promotion rules. Student processing now happens in Promotion Level, where
                admins select continuing students and archive the rest of the cohort.
              </DialogDescription>
            </DialogHeader>
            {!promotionPreview ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !promotionPreview.activeAcademicYear ? (
              <div className="py-8 text-center">
                <p className="font-medium text-destructive">No active academic year found.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please set an active academic year before promoting students.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-gray-200 bg-background p-4">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Academic Year
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {promotionPreview.activeAcademicYear.year}
                    </p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-background p-4">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Active Students
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {promotionPreview.totalStudents.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-background p-4">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Mode</p>
                    <p className="mt-1 text-lg font-semibold">Promotion Level selection</p>
                  </div>
                </div>

                {dialogPromotionRun && (
                  <div
                    className={`rounded-md border p-4 ${
                      dialogPromotionRun.status === 'FAILED'
                        ? 'border-red-200 bg-red-50'
                        : dialogPromotionRun.status === 'REVERTED'
                          ? 'border-gray-200 bg-gray-50'
                          : isDialogPromotionProcessing
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-3">
                        {dialogPromotionRun.status === 'FAILED' ? (
                          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        ) : dialogPromotionRun.status === 'REVERTED' ? (
                          <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-gray-700" />
                        ) : isDialogPromotionProcessing ? (
                          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-700" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">
                              {isDialogPromotionProcessing
                                ? 'Previous promotion run is being processed'
                                : dialogPromotionRun.status === 'FAILED'
                                  ? 'Promotion failed'
                                  : dialogPromotionRun.status === 'REVERTED'
                                    ? 'Promotion was undone'
                                    : 'Promotion complete'}
                            </p>
                            {(() => {
                              const badge = getPromotionRunBadge(dialogPromotionRun);
                              return (
                                <Badge variant="default" className={badge.className}>
                                  {badge.label}
                                </Badge>
                              );
                            })()}
                          </div>
                          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            {isDialogPromotionProcessing
                              ? 'This may take a few minutes for large student lists. You can close this dialog, leave Settings, and return later to check the result.'
                              : dialogPromotionRun.status === 'FAILED'
                                ? dialogPromotionRun.errorMessage ||
                                  'The run did not finish. Review the error and try again.'
                                : dialogPromotionRun.status === 'REVERTED'
                                  ? 'Students were restored from this run. Use Registry to review the next promotion cohort.'
                                  : 'All available results from the latest promotion run are shown below.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-md bg-white/70 p-3">
                        <p className="text-xs text-muted-foreground">
                          {isDialogPromotionProcessing ? 'Students queued' : 'Processed'}
                        </p>
                        <p className="text-base font-semibold">
                          {isDialogPromotionProcessing
                            ? dialogPromotionRun.totalStudents.toLocaleString()
                            : `${getPromotionRunProcessedCount(
                                dialogPromotionRun
                              ).toLocaleString()} / ${dialogPromotionRun.totalStudents.toLocaleString()}`}
                        </p>
                      </div>
                      <div className="rounded-md bg-white/70 p-3">
                        <p className="text-xs text-muted-foreground">Promoted</p>
                        <p className="text-base font-semibold">
                          {dialogPromotionRun.promotedCount.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-md bg-white/70 p-3">
                        <p className="text-xs text-muted-foreground">Graduated</p>
                        <p className="text-base font-semibold">
                          {dialogPromotionRun.graduatedCount.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-md bg-white/70 p-3">
                        <p className="text-xs text-muted-foreground">Issues</p>
                        <p className="text-base font-semibold">
                          {dialogPromotionRun.errorCount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Started {formatDateTime(dialogPromotionRun.startedAt)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        {isDialogPromotionProcessing
                          ? 'A toast will appear if this page is open when the run finishes.'
                          : `Finished ${formatDateTime(dialogPromotionRun.completedAt)}`}
                      </div>
                    </div>
                  </div>
                )}

                {canReviewDialogPromotion && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex gap-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        <p>
                          {hasPromotionDecisionBlockers ? (
                            <>
                              <strong>{promotionDecisionBlockers.length}</strong> student(s) need a
                              transition decision before promotion can start.
                            </>
                          ) : (
                            <>
                              Open Promotion Level to select the students continuing at Bosco/FSE. Students
                              left unchecked in the chosen cohort will be archived.
                            </>
                          )}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSaveTransitionDecisions}
                        disabled={isSavingTransitionDecisions}
                      >
                        {isSavingTransitionDecisions ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Decisions
                      </Button>
                    </div>
                  </div>
                )}

                {canReviewDialogPromotion && (
                  <div className="max-h-96 overflow-x-auto rounded-md border border-gray-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Current Level</TableHead>
                          <TableHead>Decision</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Next Level</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {promotionPreview.preview.map((student) => {
                          const selectedDecision: StudentTransitionDecision | 'UNSET' =
                            transitionDecisions[student.id] ||
                            student.transitionDecision ||
                            'UNSET';
                          const decisionOptions = getPromotionDecisionOptions(student);
                          const actionLabel =
                            student.action === 'GRADUATE'
                              ? 'Graduate'
                              : student.action === 'SEPARATE'
                                ? 'Separate'
                                : student.action === 'RETAIN'
                                  ? 'Retain'
                                  : student.action === 'SKIP'
                                    ? student.requiresDecision
                                      ? 'Decision needed'
                                      : 'Blocked'
                                    : 'Promote';

                          return (
                            <TableRow key={student.id}>
                              <TableCell>
                                {student.lastName}, {student.firstName}
                              </TableCell>
                              <TableCell>
                                {student.gradeLevel} - {student.yearLevel}
                              </TableCell>
                              <TableCell className="min-w-[220px]">
                                <Select
                                  value={selectedDecision}
                                  onValueChange={(value) => {
                                    if (isStudentTransitionDecision(value)) {
                                      handleTransitionDecisionChange(student.id, value);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="UNSET" disabled>
                                      Choose decision
                                    </SelectItem>
                                    {decisionOptions.map((decision) => (
                                      <SelectItem key={decision} value={decision}>
                                        {STUDENT_TRANSITION_DECISION_LABELS[decision]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    student.action === 'GRADUATE' || student.action === 'SEPARATE'
                                      ? 'destructive'
                                      : student.action === 'SKIP'
                                        ? 'secondary'
                                        : 'default'
                                  }
                                >
                                  {actionLabel}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {student.action === 'GRADUATE' ? (
                                  <span className="font-medium text-destructive">Graduated</span>
                                ) : student.action === 'SEPARATE' ? (
                                  <span className="font-medium text-destructive">
                                    {student.nextYearLevel}
                                  </span>
                                ) : student.action === 'RETAIN' ? (
                                  <span className="font-medium text-amber-700">
                                    Retain in {student.yearLevel}
                                  </span>
                                ) : student.action === 'SKIP' && student.requiresDecision ? (
                                  <span className="font-medium text-amber-700">
                                    Select decision first
                                  </span>
                                ) : student.action === 'SKIP' ? (
                                  <span className="text-muted-foreground">
                                    {student.reason || 'Blocked'}
                                  </span>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="text-green-600">
                                      {student.nextGradeLevel} - {student.nextYearLevel}
                                    </span>
                                    {student.nextProgram && (
                                      <div className="text-xs text-muted-foreground">
                                        {student.nextProgram}
                                        {student.nextTermType ? ` - ${student.nextTermType}` : ''}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {!canReviewDialogPromotion &&
                  !isDialogPromotionProcessing &&
                  !dialogPromotionRun && (
                    <div className="rounded-md border border-gray-200 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      Promotion is not available for this academic year.
                    </div>
                  )}

                {promotionPreview.activeAcademicYear.promotionProcessedAt &&
                  !dialogPromotionRun && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950">
                      This academic year has already been promoted. Use Undo Last Promotion before
                      running promotion again.
                    </div>
                  )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPromotionDialogOpen(false)}>
                    {isDialogPromotionProcessing ? 'Close' : 'Cancel'}
                  </Button>
                  {canStartDialogPromotion && (
                    <Button
                      onClick={handleAutoPromoteStudents}
                      disabled={isAutoPromoting}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                    >
                      {isAutoPromoting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        'Open Promotion Level'
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <TabsContent value="sessions">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Monitor className="h-5 w-5" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <SessionsTableSkeleton />
              ) : sessions.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No active sessions</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    There are no active user sessions at the moment
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Device/Browser</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">
                            {session.user.firstName} {session.user.lastName}
                            <div className="text-xs text-muted-foreground">
                              @{session.user.username}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={session.user.role === 'ADMIN' ? 'default' : 'secondary'}
                            >
                              {USER_ROLE_LABELS[session.user.role as keyof typeof USER_ROLE_LABELS]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {session.ipAddress || 'Unknown'}
                            </code>
                          </TableCell>
                          <TableCell
                            className="max-w-[200px] truncate"
                            title={session.userAgent || 'Unknown'}
                          >
                            {session.userAgent || 'Unknown'}
                          </TableCell>
                          <TableCell>{new Date(session.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{new Date(session.expiresAt).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeSession(session.id)}
                              disabled={revokingSession === session.id}
                              className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {revokingSession === session.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                              ) : (
                                'Revoke'
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {userTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {userPage} of {userTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = userPage - 1;
                        setUserPage(newPage);
                        fetchUsers(newPage);
                      }}
                      disabled={userPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = userPage + 1;
                        setUserPage(newPage);
                        fetchUsers(newPage);
                      }}
                      disabled={userPage === userTotalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Information Card */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <UserIcon className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProfile ? (
                  <ProfileInformationSkeleton />
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="profile-firstName">First Name</Label>
                      <Input
                        id="profile-firstName"
                        value={profileData.firstName}
                        onChange={(e) => {
                          setProfileData((prev) => ({ ...prev, firstName: e.target.value }));
                          setProfileErrors((prev) => ({ ...prev, firstName: undefined }));
                        }}
                        className={profileErrors.firstName ? 'border-red-500' : ''}
                      />
                      {profileErrors.firstName && (
                        <p className="text-xs text-red-500">{profileErrors.firstName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-lastName">Last Name</Label>
                      <Input
                        id="profile-lastName"
                        value={profileData.lastName}
                        onChange={(e) => {
                          setProfileData((prev) => ({ ...prev, lastName: e.target.value }));
                          setProfileErrors((prev) => ({ ...prev, lastName: undefined }));
                        }}
                        className={profileErrors.lastName ? 'border-red-500' : ''}
                      />
                      {profileErrors.lastName && (
                        <p className="text-xs text-red-500">{profileErrors.lastName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-email">Email</Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => {
                          setProfileData((prev) => ({ ...prev, email: e.target.value }));
                          setProfileErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        className={profileErrors.email ? 'border-red-500' : ''}
                      />
                      {profileErrors.email && (
                        <p className="text-xs text-red-500">{profileErrors.email}</p>
                      )}
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={handleUpdateProfile}
                        disabled={isUpdatingProfile}
                        className="w-full"
                        style={{
                          background: 'linear-gradient(to right, #22c55e, #10b981, #14b8a6)',
                          boxShadow: '0 4px 15px 0 rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        {isUpdatingProfile ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                            Updating...
                          </>
                        ) : (
                          'Update Profile'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="Enter current password"
                      value={changePasswordData.currentPassword}
                      onChange={(e) => {
                        setChangePasswordData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }));
                        setChangePasswordErrors((prev) => ({
                          ...prev,
                          currentPassword: undefined,
                        }));
                      }}
                      className={changePasswordErrors.currentPassword ? 'border-red-500' : ''}
                    />
                    {changePasswordErrors.currentPassword && (
                      <p className="text-xs text-red-500">{changePasswordErrors.currentPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password-profile">New Password</Label>
                    <Input
                      id="new-password-profile"
                      type="password"
                      placeholder="Enter new password (min 8 characters)"
                      value={changePasswordData.newPassword}
                      onChange={(e) => {
                        setChangePasswordData((prev) => ({ ...prev, newPassword: e.target.value }));
                        setChangePasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                      }}
                      className={changePasswordErrors.newPassword ? 'border-red-500' : ''}
                    />
                    {changePasswordErrors.newPassword && (
                      <p className="text-xs text-red-500">{changePasswordErrors.newPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password-profile">Confirm New Password</Label>
                    <Input
                      id="confirm-password-profile"
                      type="password"
                      placeholder="Confirm new password"
                      value={changePasswordData.confirmPassword}
                      onChange={(e) => {
                        setChangePasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }));
                        setChangePasswordErrors((prev) => ({
                          ...prev,
                          confirmPassword: undefined,
                        }));
                      }}
                      className={changePasswordErrors.confirmPassword ? 'border-red-500' : ''}
                    />
                    {changePasswordErrors.confirmPassword && (
                      <p className="text-xs text-red-500">{changePasswordErrors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                      className="w-full"
                      style={{
                        background: 'linear-gradient(to right, #22c55e, #10b981, #14b8a6)',
                        boxShadow: '0 4px 15px 0 rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                          Changing...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit-logs">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5" />
                Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select
                      value={auditLogFilters.action}
                      onValueChange={(value) => handleAuditLogFilterChange('action', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Actions</SelectItem>
                        {auditLogFilterOptions.actions.map((action) => (
                          <SelectItem key={action} value={action}>
                            {action}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Resource Type</Label>
                    <Select
                      value={auditLogFilters.resourceType}
                      onValueChange={(value) => handleAuditLogFilterChange('resourceType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Resources</SelectItem>
                        {auditLogFilterOptions.resourceTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={auditLogFilters.startDate}
                      onChange={(e) => handleAuditLogFilterChange('startDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={auditLogFilters.endDate}
                      onChange={(e) => handleAuditLogFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={applyAuditLogFilters} size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                  <Button onClick={clearAuditLogFilters} variant="outline" size="sm">
                    Clear Filters
                  </Button>
                </div>

                {/* Results info */}
                <div className="text-sm text-muted-foreground">
                  Showing {auditLogs.length} of {auditLogTotal} logs
                </div>
              </div>

              {loadingAuditLogs ? (
                <AuditLogsTableSkeleton />
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No audit logs found</h3>
                  <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Resource</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {log.user ? (
                                <div>
                                  <div className="font-medium">
                                    {log.user.firstName} {log.user.lastName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    @{log.user.username}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">System</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>
                              {log.resourceType ? (
                                <div>
                                  <div className="font-medium">{log.resourceType}</div>
                                  {log.resourceId && (
                                    <div className="text-xs text-muted-foreground">
                                      ID: {log.resourceId}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {log.ipAddress || 'Unknown'}
                              </code>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {log.details ? (
                                <details className="cursor-pointer">
                                  <summary className="text-xs text-blue-600 hover:underline">
                                    View Details
                                  </summary>
                                  <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-[200px]">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </details>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {auditLogTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {auditLogPage} of {auditLogTotalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAuditLogs(auditLogPage - 1)}
                          disabled={auditLogPage === 1 || loadingAuditLogs}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAuditLogs(auditLogPage + 1)}
                          disabled={auditLogPage === auditLogTotalPages || loadingAuditLogs}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
