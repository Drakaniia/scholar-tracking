'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    
    try {
      const validatedData = loginSchema.parse(data);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Login successful! Redirecting...');
        router.push('/');
        router.refresh();
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl flex-1 flex items-center justify-center">
        <Card className="bg-transparent border-0 shadow-none w-full">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Side - Logo and Title */}
            <div className="bg-transparent p-8 md:p-12 flex flex-col items-center justify-center text-slate-800 rounded-l-lg">
              <div className="w-32 h-32 mb-6 bg-white rounded-full flex items-center justify-center p-4 shadow-lg">
                <Image
                  src="/images/logo.png"
                  alt="Scholarship Tracking System Logo"
                  width={96}
                  height={96}
                  className="w-full h-full object-contain"
                  unoptimized
                  priority
                />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                Scholarship Tracking
              </h1>
              <h2 className="text-xl md:text-2xl font-semibold text-center text-slate-600">
                System
              </h2>
            </div>

            {/* Right Side - Login Form */}
            <CardContent className="p-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-r-lg shadow-xl">
              <div className="p-6 md:px-12 md:py-8">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-white mb-2">Welcome!</h3>
                  <p className="text-emerald-50">Please sign in to access the dashboard</p>
                </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white font-medium">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      className="pl-10 h-12 bg-white border-white/20 text-slate-900 placeholder:text-slate-400 focus:border-white focus:ring-white focus-visible:ring-white focus-visible:ring-offset-0"
                      {...register('username')}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-200 text-sm font-medium">{errors.username.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-12 bg-white border-white/20 text-slate-900 placeholder:text-slate-400 focus:border-white focus:ring-white focus-visible:ring-white focus-visible:ring-offset-0"
                      {...register('password')}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-200 text-sm font-medium">{errors.password.message}</p>
                  )}
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <button
                    type="button"
                    className="text-white hover:text-emerald-100 text-sm font-medium transition-colors underline"
                    disabled={isLoading}
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-white text-emerald-600 hover:bg-emerald-50 font-semibold text-lg transition-colors duration-200 focus-visible:ring-white focus-visible:ring-offset-0"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'LOGIN'}
                </Button>
              </form>
            </div>
            </CardContent>
          </div>
        </Card>
      </div>
      
      {/* Footer - Outside the card */}
      <div className="w-full text-center py-4 text-sm text-slate-600">
        <p>© 2024 Scholarship Tracking System</p>
        <p className="text-slate-500">Secure access to educational resources</p>
      </div>
    </div>
  );
}