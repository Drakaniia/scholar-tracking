'use client';

import { useState } from "react";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { BorderBeam } from "@/components/ui/border-beam";
import logoImage from "@/assets/images/logo.webp";
import backgroundImage from "@/assets/images/background2.jpg";

const LoginPage = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 h-full w-full">
        <Image
          src={backgroundImage}
          alt="Background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with logo and text */}
        <header className="p-6 flex items-center gap-4 shadow-lg" style={{ background: "#0e442c" }}>
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
        <div className="text-white">
          <h1 className="text-xl font-bold">De La Salle John Bosco College</h1>
          <p className="text-sm opacity-90">Automated Scholarship Record Management System</p>
        </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-start px-19 pb-15 -mt-1">
          <div className="w-full max-w-5xl flex flex-col gap-8">
            {/* Left side - Glassmorphism form */}
            <div className="w-full max-w-2xl">
                <div
                  className="rounded-3xl p-12 shadow-2xl border relative overflow-hidden backdrop-blur-md min-h-[480px]"
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    borderColor: "rgba(255, 255, 255, 0.3)",
                    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)"
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
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-700 mb-2">Welcome back!</h2>
                    <p className="text-gray-600">Please login to get started.
                    </p>
                  </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5 flex flex-col flex-1">
                  {/* Username field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Username</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                      <Input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-11 h-12 rounded-xl text-gray-800 placeholder:text-gray-500 border-white/30 backdrop-blur-sm"
                        style={{
                          background: "rgba(255, 255, 255, 0.2)",
                          backdropFilter: "blur(10px)"
                        }}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-11 h-12 rounded-xl text-gray-800 placeholder:text-gray-500 border-white/30 backdrop-blur-sm"
                        style={{
                          background: "rgba(255, 255, 255, 0.2)",
                          backdropFilter: "blur(10px)"
                        }}
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 hover:text-gray-800 transition-colors"
                        disabled={isLoading}
                      >
                        {showPassword ? <Eye /> : <EyeOff />}
                      </button>
                    </div>
                  </div>

                  {/* Submit button */}
                  <div className="mt-auto" style={{ marginTop: "2.25rem" }}>
                    <Button
                      type="submit"
                      variant="gradient"
                      className="w-full h-12 text-base font-semibold rounded-xl"
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

          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-2" style={{ background: "#0e442c" }}>
          <p className="text-center text-white text-sm">
            @2026 De La Salle John Bosco College | All Rights Reserved
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
