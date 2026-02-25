'use client';

import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  progress: number;
  currentStep: string;
}

export function LoadingScreen({ progress, currentStep }: LoadingScreenProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#9ed2ac] to-[#9ed2ac] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Loading Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/50">
          {/* Progress Ring */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20">
              {/* Background circle */}
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-white/40"
                />
                {/* Progress circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 36}
                  strokeDashoffset={2 * Math.PI * 36 * (1 - displayProgress / 100)}
                  className="text-emerald-500 transition-all duration-500 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              {/* Percentage in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-emerald-600">
                  {Math.round(displayProgress)}%
                </span>
              </div>
            </div>
          </div>

          {/* Loading Steps */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                {progress < 25 ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${progress >= 25 ? 'text-slate-700' : 'text-slate-400'}`}>
                Verifying authentication
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                {progress < 50 ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${progress >= 50 ? 'text-slate-700' : 'text-slate-400'}`}>
                Loading dashboard data
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                {progress < 75 ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${progress >= 75 ? 'text-slate-700' : 'text-slate-400'}`}>
                Fetching detailed reports
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                {progress < 100 ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${progress >= 100 ? 'text-slate-700' : 'text-slate-400'}`}>
                Preparing dashboard
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>

          {/* Current Step Text */}
          <p className="mt-4 text-center text-sm text-slate-600 font-medium">
            {currentStep}
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/80 mt-6 font-medium">
          Please wait while we load your dashboard
        </p>
      </div>
    </div>
  );
}
