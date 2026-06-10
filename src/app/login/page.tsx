'use client';

import { useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BACKGROUND_IMAGE_URL = '/images/background2.jpg';
const LOGO_IMAGE_URL = '/images/logo.webp';

const LoginPage = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      // Handle different response types properly
      let result;
      if (response.headers.get('content-type')?.includes('application/json')) {
        result = await response.json();
      } else {
        // If response is not JSON, create a generic error object
        result = { error: 'Invalid response format' };
      }

      if (response.ok && result.success) {
        // Store user data in sessionStorage for instant auth on next page load
        if (result.user) {
          sessionStorage.setItem('scholartrack_user', JSON.stringify(result.user));
        }

        // Redirect directly to dashboard
        router.push('/');
      } else {
        toast.error(result.error || 'Login failed');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#041a12] text-[#f8f4e8]">
      <Image
        src={BACKGROUND_IMAGE_URL}
        alt=""
        fill
        priority
        unoptimized
        className="absolute inset-0 object-cover object-[58%_center]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,26,18,0.98)_0%,rgba(6,43,29,0.92)_34%,rgba(9,46,31,0.58)_58%,rgba(4,26,18,0.12)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_38%,rgba(224,184,72,0.26),transparent_32%),linear-gradient(180deg,rgba(4,26,18,0.64)_0%,transparent_30%,rgba(4,26,18,0.82)_100%)]"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="relative h-14 w-14 shrink-0 rounded-full bg-white p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.55),0_14px_34px_rgba(0,0,0,0.28)] sm:h-16 sm:w-16">
              <Image
                src={LOGO_IMAGE_URL}
                alt="De La Salle John Bosco College"
                width={64}
                height={64}
                className="h-full w-full object-contain"
                priority
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-[0.01em] text-white sm:text-2xl">
                De La Salle John Bosco College
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f5df9b] shadow-lg backdrop-blur-md lg:flex">
            <ShieldCheck className="size-4" />
            Secure Portal
          </div>
        </header>

        <main className="grid flex-1 items-center gap-10 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[minmax(360px,560px)_1fr] lg:px-20 lg:pb-16 lg:pt-4">
          <section className="w-full max-w-[540px]">
            <div className="mb-6 hidden h-px w-32 bg-gradient-to-r from-[#f0cf74] via-[#f0cf74]/70 to-transparent sm:block" />

            <div className="relative overflow-hidden rounded-[1.75rem] border border-[#e7d6a0]/50 bg-[#fffaf0]/96 p-6 text-[#11261c] shadow-[0_30px_80px_rgba(0,0,0,0.42)] sm:p-8 lg:p-10">
              <div
                aria-hidden="true"
                className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-[#0d5b3b] via-[#e0b848] to-[#13a06f]"
              />
              <div
                aria-hidden="true"
                className="absolute -right-24 -top-24 h-52 w-52 rounded-full border border-[#0d5b3b]/10"
              />
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 h-36 w-36 rounded-full border border-[#0d5b3b]/10"
              />

              <div className="relative">
                <div className="mb-8">
                  <h2 className="text-3xl font-black leading-[0.98] text-[#0b2c1d] sm:text-4xl">
                    Automated Scholarship System for FSE
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-6 text-[#4b5d52] sm:text-base">
                    Sign in to manage scholarship records, student assistance data, and annual fee
                    tracking.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-bold text-[#173d2b]">
                      Username
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-[#0d5b3b]" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-[52px] rounded-2xl border-[#cfddcf] bg-white/95 pl-12 pr-4 text-base font-medium text-[#12261c] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_28px_rgba(13,91,59,0.08)] placeholder:text-[#7b8b81] focus-visible:border-[#0d5b3b] focus-visible:ring-[#0d5b3b]/20"
                        disabled={isLoading}
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-bold text-[#173d2b]">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-[#0d5b3b]" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-[52px] rounded-2xl border-[#cfddcf] bg-white/95 pl-12 pr-[52px] text-base font-medium text-[#12261c] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_28px_rgba(13,91,59,0.08)] placeholder:text-[#7b8b81] focus-visible:border-[#0d5b3b] focus-visible:ring-[#0d5b3b]/20"
                        disabled={isLoading}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-[#53665a] transition-colors hover:text-[#0d5b3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d5b3b]/35"
                        disabled={isLoading}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="group mt-7 h-[52px] w-full rounded-2xl bg-[#0d5b3b] text-base font-extrabold text-white shadow-[0_16px_32px_rgba(13,91,59,0.28)] hover:bg-[#0b4d32] hover:shadow-[0_18px_38px_rgba(13,91,59,0.34)] focus-visible:ring-[#e0b848]/50"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                        Verifying access
                      </>
                    ) : (
                      <>
                        Login
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </section>
        </main>

        <footer className="px-5 py-3 text-center text-xs font-medium text-[#d6ead9] sm:text-sm">
          ©2026 De La Salle John Bosco College | All Rights Reserved
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
