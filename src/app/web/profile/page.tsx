'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { User, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { YEAR_LEVELS, EDUCATION_LEVELS } from '@/types';

interface StudentProfile {
    id: number;
    firstName: string;
    middleName: string | null;
    lastName: string;
    yearLevel: string;
    course: string;
    tuitionFee: number;
    educationLevel: string;
    user?: {
        email: string;
    };
}

export default function WebProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        yearLevel: '1st Year',
        course: '',
        educationLevel: 'College',
        tuitionFee: 0,
    });

    useEffect(() => {
        async function fetchProfile() {
            try {
                const res = await fetch('/api/web/profile');
                const json = await res.json();
                if (json.success) {
                    setProfile(json.data);
                    setFormData({
                        firstName: json.data.firstName,
                        lastName: json.data.lastName,
                        yearLevel: json.data.yearLevel,
                        course: json.data.course,
                        educationLevel: json.data.educationLevel,
                        tuitionFee: json.data.tuitionFee,
                    });
                } else if (res.status === 401) {
                    router.push('/web/login');
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch('/api/web/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const json = await res.json();
            if (json.success) {
                toast.success('Profile updated successfully!');
                setProfile(json.data);
            } else {
                toast.error(json.error || 'Update failed');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Profile</h1>
                <p className="text-muted-foreground mt-2">
                    Update your personal information
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input
                                            id="firstName"
                                            value={formData.firstName}
                                            onChange={(e) =>
                                                setFormData({ ...formData, firstName: e.target.value })
                                            }
                                            required
                                            disabled={saving}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            value={formData.lastName}
                                            onChange={(e) =>
                                                setFormData({ ...formData, lastName: e.target.value })
                                            }
                                            required
                                            disabled={saving}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="educationLevel">Education Level</Label>
                                        <Select
                                            value={formData.educationLevel}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, educationLevel: value })
                                            }
                                            disabled={saving}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EDUCATION_LEVELS.map((level) => (
                                                    <SelectItem key={level} value={level}>
                                                        {level}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="yearLevel">Year Level</Label>
                                        <Select
                                            value={formData.yearLevel}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, yearLevel: value })
                                            }
                                            disabled={saving}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {YEAR_LEVELS.map((level) => (
                                                    <SelectItem key={level} value={level}>
                                                        {level}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="course">Course/Program</Label>
                                    <Input
                                        id="course"
                                        value={formData.course}
                                        onChange={(e) =>
                                            setFormData({ ...formData, course: e.target.value })
                                        }
                                        required
                                        disabled={saving}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tuitionFee">Tuition Fee (₱)</Label>
                                    <Input
                                        id="tuitionFee"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.tuitionFee}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                tuitionFee: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        required
                                        disabled={saving}
                                    />
                                </div>

                                <Button type="submit" disabled={saving} className="w-full">
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                <p className="text-lg">{profile?.user?.email || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Student ID</p>
                                <p className="text-lg">{profile?.id}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}