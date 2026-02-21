'use client';

import { useEffect, useState } from 'react';
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
import { Users, Shield, UserPlus, X } from 'lucide-react';
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

 useEffect(() => {
 fetchUsers();
 }, []);

 const fetchUsers = async () => {
 try {
 const url = '/api/users';
 const data = await fetchWithCache<{ success: boolean; data: User[] }>(
 url,
 undefined,
 5 * 60 * 1000 // 5 minutes cache
 );

 if (data.success) {
 setUsers(data.data);
 } else {
 toast.error('Failed to load users');
 }
 } catch (error) {
 console.error('Error fetching users:', error);
 toast.error('Failed to load users');
 } finally {
 setLoading(false);
 }
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
 {users.length === 0 ? (
 <div className="text-center py-12">
 <Users className="mx-auto h-12 w-12 text-muted-foreground" />
 <h3 className="mt-4 text-lg font-semibold">No users found</h3>
 <p className="text-sm text-muted-foreground mt-2">
 Click "Create User" to add your first user
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
 {updating === user.id && (
 <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
 )}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
