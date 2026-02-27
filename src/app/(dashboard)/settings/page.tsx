'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from '@/components/ui/dialog';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, UserPlus, Pencil, Trash2, KeyRound, Search, Filter, Activity, Monitor, User as UserIcon, Lock, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from '@/types';
import { fetchWithCache, clientCache } from '@/lib/cache';

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
 const [editFormData, setEditFormData] = useState<EditUserFormData>({ firstName: '', lastName: '', email: '' });
 const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditUserFormData, string>>>({});
 const [isEditing, setIsEditing] = useState(false);

 // Delete user state
 const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
 const [deletingUser, setDeletingUser] = useState<User | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);

 // Reset password state
 const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
 const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
 const [resetPasswordFormData, setResetPasswordFormData] = useState<ResetPasswordFormData>({ newPassword: '', confirmPassword: '' });
 const [resetPasswordErrors, setResetPasswordErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
 const [isResettingPassword, setIsResettingPassword] = useState(false);

 // Session management state
 const [sessions, setSessions] = useState<SessionData[]>([]);
 const [loadingSessions, setLoadingSessions] = useState(false);
 const [revokingSession, setRevokingSession] = useState<string | null>(null);

 // Profile state
 const [profileData, setProfileData] = useState<ProfileFormData>({ firstName: '', lastName: '', email: '' });
 const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
 const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
 const [loadingProfile, setLoadingProfile] = useState(false);

 // Change password state
 const [changePasswordData, setChangePasswordData] = useState<ChangePasswordFormData>({ currentPassword: '', newPassword: '', confirmPassword: '' });
 const [changePasswordErrors, setChangePasswordErrors] = useState<Partial<Record<keyof ChangePasswordFormData, string>>>({});
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
 const [auditLogFilterOptions, setAuditLogFilterOptions] = useState<{ actions: string[]; resourceTypes: string[] }>({ actions: [], resourceTypes: [] });

 useEffect(() => {
 fetchUsers();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const fetchUsers = useCallback(async (page = userPage) => {
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
 const data = await fetchWithCache<{ success: boolean; data: User[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
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
 }, [userPage, userLimit, searchQuery, roleFilter, statusFilter]);

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

 const handleInputChange = (
 field: keyof CreateUserFormData,
 value: string
 ) => {
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
 const res = await fetch('/api/sessions');
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
 const res = await fetch('/api/profile');
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
 const res = await fetch('/api/audit-logs/filter-options');
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

 const res = await fetch(`/api/audit-logs?${params}`);
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
 setAuditLogFilters(prev => ({ ...prev, [key]: value }));
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

 if (loading) {
 return (
 <div className="flex h-[50vh] items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 return (
 <div>
 <PageHeader
 title="Settings"
 description="Manage system settings and user permissions"
 />

 <Tabs defaultValue="users" className="space-y-4">
 <TabsList>
 <TabsTrigger value="users" className="gap-2">
 <Users className="h-4 w-4" />
 User Management
 </TabsTrigger>
 <TabsTrigger value="sessions" className="gap-2" onClick={() => fetchSessions()}>
 <Monitor className="h-4 w-4" />
 Active Sessions
 </TabsTrigger>
 <TabsTrigger value="profile" className="gap-2" onClick={() => fetchProfile()}>
 <UserIcon className="h-4 w-4" />
 My Profile
 </TabsTrigger>
 <TabsTrigger value="audit-logs" className="gap-2" onClick={() => {
 fetchAuditLogFilterOptions();
 fetchAuditLogs(1);
 }}>
 <FileText className="h-4 w-4" />
 Audit Logs
 </TabsTrigger>
 </TabsList>

 <TabsContent value="users">
 <Card className="border-gray-200">
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2 text-foreground">
 <Users className="h-5 w-5" />
 User Management
 </CardTitle>
 <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
 setIsCreateDialogOpen(open);
 if (!open) resetForm();
 }}>
 <DialogTrigger asChild>
 <Button className="gap-2" style={{
   background: "linear-gradient(to right, #22c55e, #10b981, #14b8a6)",
   boxShadow: "0 4px 15px 0 rgba(34, 197, 94, 0.3)"
 }}>
 <UserPlus className="h-4 w-4" />
 Create User
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-[500px]">
 <DialogHeader>
 <DialogTitle>Create New User</DialogTitle>
 <DialogDescription>
 Add a new user to the system. The user will be able to login with the credentials you set.
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
 {errors.email && (
 <p className="text-xs text-red-500">{errors.email}</p>
 )}
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
 <SelectItem value="INACTIVE">{USER_STATUS_LABELS.INACTIVE}</SelectItem>
 <SelectItem value="SUSPENDED">{USER_STATUS_LABELS.SUSPENDED}</SelectItem>
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
   background: "linear-gradient(to right, #22c55e, #10b981, #14b8a6)",
   boxShadow: "0 4px 15px 0 rgba(34, 197, 94, 0.3)"
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
 <Badge variant="outline" className="ml-2">You</Badge>
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
 <SelectItem value="STAFF">
 {USER_ROLE_LABELS.STAFF}
 </SelectItem>
 <SelectItem value="VIEWER">
 {USER_ROLE_LABELS.VIEWER}
 </SelectItem>
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
 <SelectItem value="ACTIVE">
 {USER_STATUS_LABELS.ACTIVE}
 </SelectItem>
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
 {user.lastLogin
 ? new Date(user.lastLogin).toLocaleString()
 : 'Never'}
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
 setEditFormData(prev => ({ ...prev, firstName: e.target.value }));
 setEditErrors(prev => ({ ...prev, firstName: undefined }));
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
 setEditFormData(prev => ({ ...prev, lastName: e.target.value }));
 setEditErrors(prev => ({ ...prev, lastName: undefined }));
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
 setEditFormData(prev => ({ ...prev, email: e.target.value }));
 setEditErrors(prev => ({ ...prev, email: undefined }));
 }}
 className={editErrors.email ? 'border-red-500' : ''}
 />
 {editErrors.email && (
 <p className="text-xs text-red-500">{editErrors.email}</p>
 )}
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
   background: "linear-gradient(to right, #22c55e, #10b981, #14b8a6)",
   boxShadow: "0 4px 15px 0 rgba(34, 197, 94, 0.3)"
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
 <Button
 variant="destructive"
 onClick={handleDeleteUser}
 disabled={isDeleting}
 >
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
 setResetPasswordFormData(prev => ({ ...prev, newPassword: e.target.value }));
 setResetPasswordErrors(prev => ({ ...prev, newPassword: undefined }));
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
 setResetPasswordFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
 setResetPasswordErrors(prev => ({ ...prev, confirmPassword: undefined }));
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
   background: "linear-gradient(to right, #22c55e, #10b981, #14b8a6)",
   boxShadow: "0 4px 15px 0 rgba(34, 197, 94, 0.3)"
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
 <div className="flex h-[30vh] items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
 </div>
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
 <Badge variant={session.user.role === 'ADMIN' ? 'default' : 'secondary'}>
 {USER_ROLE_LABELS[session.user.role as keyof typeof USER_ROLE_LABELS]}
 </Badge>
 </TableCell>
 <TableCell>
 <code className="text-xs bg-muted px-2 py-1 rounded">
 {session.ipAddress || 'Unknown'}
 </code>
 </TableCell>
 <TableCell className="max-w-[200px] truncate" title={session.userAgent || 'Unknown'}>
 {session.userAgent || 'Unknown'}
 </TableCell>
 <TableCell>
 {new Date(session.createdAt).toLocaleString()}
 </TableCell>
 <TableCell>
 {new Date(session.expiresAt).toLocaleString()}
 </TableCell>
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
 <div className="flex h-[200px] items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
 </div>
 ) : (
 <div className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="profile-firstName">First Name</Label>
 <Input
 id="profile-firstName"
 value={profileData.firstName}
 onChange={(e) => {
 setProfileData(prev => ({ ...prev, firstName: e.target.value }));
 setProfileErrors(prev => ({ ...prev, firstName: undefined }));
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
 setProfileData(prev => ({ ...prev, lastName: e.target.value }));
 setProfileErrors(prev => ({ ...prev, lastName: undefined }));
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
 setProfileData(prev => ({ ...prev, email: e.target.value }));
 setProfileErrors(prev => ({ ...prev, email: undefined }));
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
   background: "linear-gradient(to right, #22c55e, #10b981, #14b8a6)",
   boxShadow: "0 4px 15px 0 rgba(34, 197, 94, 0.3)"
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
 setChangePasswordData(prev => ({ ...prev, currentPassword: e.target.value }));
 setChangePasswordErrors(prev => ({ ...prev, currentPassword: undefined }));
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
 setChangePasswordData(prev => ({ ...prev, newPassword: e.target.value }));
 setChangePasswordErrors(prev => ({ ...prev, newPassword: undefined }));
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
 setChangePasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
 setChangePasswordErrors(prev => ({ ...prev, confirmPassword: undefined }));
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
   background: "linear-gradient(to right, #22c55e, #10b981, #14b8a6)",
   boxShadow: "0 4px 15px 0 rgba(34, 197, 94, 0.3)"
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
 {auditLogFilterOptions.actions.map(action => (
 <SelectItem key={action} value={action}>{action}</SelectItem>
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
 {auditLogFilterOptions.resourceTypes.map(type => (
 <SelectItem key={type} value={type}>{type}</SelectItem>
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
 <div className="flex h-[30vh] items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
 </div>
 ) : auditLogs.length === 0 ? (
 <div className="text-center py-12">
 <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
 <h3 className="mt-4 text-lg font-semibold">No audit logs found</h3>
 <p className="text-sm text-muted-foreground mt-2">
 Try adjusting your filters
 </p>
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
