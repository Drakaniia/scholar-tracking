'use client';

import { useState } from "react";
import Image from "next/image";
import { Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { GridPattern } from "@/components/ui/grid-pattern";
import { BorderBeam } from "@/components/ui/border-beam";
import logoImage from "@/assets/images/logo.webp";
import illustrationImage from "@/assets/images/illustration.svg";

const LoginPage = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        // Set the dashboard visit flag so the loader doesn't show after login
        localStorage.setItem('hasVisitedDashboard', 'true');
        // Redirect immediately to dashboard
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-r from-[#fefdfb] to-[#fefdfb]">
      {/* GridPattern background */}
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <GridPattern />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with logo and text */}
        <header className="p-6 flex items-center gap-4">
          <div className="h-16 w-16 relative">
            <Image
              src={logoImage}
              alt="De La Salle John Bosco College"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        <div className="text-gray-800">
          <h1 className="text-xl font-bold">De La Salle John Bosco College</h1>
          <p className="text-sm">Automated Scholarship Record Management System</p>
        </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-4 pb-8 -mt-8">
          <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            {/* Left side - Glassmorphism form */}
            <div className="w-full max-w-md transform lg:-translate-y-8">
                <div
                  className="rounded-3xl p-8 shadow-xl border relative overflow-hidden"
                  style={{
                    background: "rgba(255, 255, 255, 0.95)",
                    borderColor: "rgba(220, 220, 220, 0.5)",
                    boxShadow: "0 10px 25px 0 rgba(0, 0, 0, 0.1)"
                  }}
                >
                  <BorderBeam
                    size={300}
                    duration={4}
                    delay={0}
                    colorFrom="#22c55e"
                    colorTo="#14b8a6"
                    reverse
                  />

                  {/* Welcome Message */}
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-700 mb-2">Welcome back!</h2>
                    <p className="text-gray-600">Please login to get started.</p>
                  </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Username field */}
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-11 h-12 rounded-xl text-gray-800 placeholder:text-gray-500 border-gray-300"
                    style={{
                      background: "rgba(255, 255, 255, 0.9)",
                      backdropFilter: "blur(10px)"
                    }}
                    disabled={isLoading}
                    required
                  />
                  </div>

                  {/* Password field */}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 rounded-xl text-gray-800 placeholder:text-gray-500 border-gray-300"
                    style={{
                      background: "rgba(255, 255, 255, 0.9)",
                      backdropFilter: "blur(10px)"
                    }}
                    disabled={isLoading}
                    required
                  />
                  </div>

                   {/* Submit button */}
                   <div style={{ marginTop: "1.25rem" }}>
                     <Button
                       type="submit"
                       className="w-full h-12 text-base font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0 text-white flex items-center justify-center"
                       style={{
                         background: "linear-gradient(to right, #22c55e, #10b981, #14b8a6)",
                         boxShadow: "0 4px 15px 0 rgba(34, 197, 94, 0.3)"
                       }}
                       disabled={isLoading}
                     >
                       {isLoading ? (
                         <>
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                           Please wait...
                         </>
                       ) : (
                         "Login"
                       )}
                     </Button>
                   </div>
                </form>
              </div>
            </div>

            {/* Right side - Illustration */}
            <div className="hidden lg:flex flex-1 justify-center items-center transform lg:-translate-y-8">
              <Image
                src={illustrationImage}
                alt="Workspace Illustration"
                width={500}
                height={400}
                className="w-full h-auto max-w-md"
                priority={false}
                loading="lazy"
                quality={85}
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YwZjBmMCIvPjwvc3ZnPg=="
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
