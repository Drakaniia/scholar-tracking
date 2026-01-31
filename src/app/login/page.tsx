'use client';

import { useState } from "react";
import Image from "next/image";
import { Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
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
        toast.success('Login successful! Redirecting...');
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
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
    <div className="min-h-screen relative overflow-hidden login-gradient-bg">
      {/* Green gradient background - now using CSS class */}

      {/* Decorative organic shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #88d4ab 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
      />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #1a936f 0%, transparent 70%)", transform: "translate(-30%, 30%)" }}
      />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, #114b5f 0%, transparent 70%)" }}
      />
      <div className="absolute top-1/4 left-1/3 w-48 h-48 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #88d4ab 0%, transparent 70%)" }}
      />

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
          <div className="text-white">
            <h1 className="text-xl font-bold">De La Salle John Bosco College</h1>
            <p className="text-sm text-white/80">Scholarship Tracking System</p>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-4 pb-8 -mt-8">
          <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            {/* Left side - Glassmorphism form */}
            <div className="w-full max-w-md transform lg:-translate-y-8">
              <div
                className="rounded-3xl p-8 shadow-2xl border border-white/30"
                style={{
                  background: "rgba(255, 255, 255, 0.85)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)"
                }}
              >
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/50 rounded-xl p-1 mb-6">
                    <TabsTrigger
                      value="login"
                      className={`rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1a936f] data-[state=inactive]:text-gray-500`}
                    >
                      Login
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className={`rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1a936f] data-[state=inactive]:text-gray-500`}
                    >
                      Sign Up
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Username field - always visible */}
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-11 h-12 bg-white/60 border-gray-200 focus:border-[#1a936f] focus:ring-[#1a936f] rounded-xl"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {/* Password field - always visible */}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 h-12 bg-white/60 border-gray-200 focus:border-[#1a936f] focus:ring-[#1a936f] rounded-xl"
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
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <Input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11 h-12 bg-white/60 border-gray-200 focus:border-[#1a936f] focus:ring-[#1a936f] rounded-xl"
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
                      className="text-sm text-[#1a936f] hover:text-[#114b5f] transition-colors hover:underline"
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
                      className="w-full h-12 text-base font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: "linear-gradient(135deg, #1a936f 0%, #114b5f 100%)",
                        color: "white"
                      }}
                      disabled={isLoading}
                    >
                      <span className="transition-all duration-300">
                        {isLoading ? "Please wait..." : activeTab === "login" ? "Login" : "Sign Up"}
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