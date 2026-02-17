'use client';

import { useState } from "react";
import Image from "next/image";
import { Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GridPattern } from "@/components/ui/grid-pattern";
import { BorderBeam } from "@/components/ui/border-beam";
import logoImage from "@/assets/images/logo.webp";
import illustrationImage from "@/assets/images/illustration.svg";

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === "signup") {
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      toast.info("Sign up functionality coming soon");
      return;
    }

    // Login logic
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Clear the dashboard visit flag to show loader on first dashboard visit
        localStorage.removeItem('hasVisitedDashboard');
        // Redirect immediately to dashboard
        window.location.href = '/';
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
          <p className="text-sm">Scholarship Tracking System</p>
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
                  {/* Tabs */}
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 mb-6" style={{
                      background: "rgba(220, 220, 220, 0.3)",
                      backdropFilter: "blur(10px)"
                    }}>
                      <TabsTrigger
                        value="login"
                        className="rounded-lg data-[state=active]:text-gray-800 text-gray-600 transition-all border-0"
                        style={{
                          backgroundColor: activeTab === "login" ? "rgba(255, 255, 255, 0.9)" : "transparent",
                          border: "none"
                        }}
                      >
                        Login
                      </TabsTrigger>
                      <TabsTrigger
                        value="signup"
                        className="rounded-lg data-[state=active]:text-gray-800 text-gray-600 transition-all border-0"
                        style={{
                          backgroundColor: activeTab === "signup" ? "rgba(255, 255, 255, 0.9)" : "transparent",
                          border: "none"
                        }}
                      >
                        Sign Up
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Username field - always visible */}
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

                  {/* Password field - always visible */}
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

                  {/* Confirm Password field - only for signup, positioned absolutely to not affect layout */}
                  <div 
                    className="relative transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: activeTab === "signup" ? "60px" : "0",
                      opacity: activeTab === "signup" ? 1 : 0,
                      marginTop: activeTab === "signup" ? "1.25rem" : "0",
                      overflow: "hidden"
                    }}
                  >
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70 z-10" />
                    <Input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11 h-12 rounded-xl text-gray-800 placeholder:text-gray-500 border-gray-300"
                      style={{
                        background: "rgba(255, 255, 255, 0.9)",
                        backdropFilter: "blur(10px)"
                      }}
                      disabled={isLoading || activeTab !== "signup"}
                      required={activeTab === "signup"}
                      tabIndex={activeTab === "signup" ? 0 : -1}
                    />
                  </div>

                  {/* Forgot password link - only for login */}
                  <div 
                    className="text-right transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: activeTab === "login" ? "32px" : "0",
                      opacity: activeTab === "login" ? 1 : 0,
                      marginTop: activeTab === "login" ? "1.25rem" : "0",
                      overflow: "hidden"
                    }}
                  >
                    <a
                      href="#"
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors hover:underline"
                      onClick={(e) => e.preventDefault()}
                      tabIndex={activeTab === "login" ? 0 : -1}
                    >
                      Forgot your password?
                    </a>
                  </div>

                  {/* Submit button - always visible, text morphs */}
                  <div style={{ marginTop: "1.25rem" }}>
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0 text-white"
                      style={{
                        background: "linear-gradient(to right, #22c55e, #10b981, #14b8a6)",
                        boxShadow: "0 4px 15px 0 rgba(34, 197, 94, 0.3)"
                      }}
                      disabled={isLoading}
                    >
                      <span className="transition-all duration-300">
                        {activeTab === "login" ? "Login" : "Sign Up"}
                      </span>
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

export default AuthPage;