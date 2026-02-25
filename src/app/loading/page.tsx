'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/loading/loading-screen';

const LOADING_STEPS = {
  AUTH: { progress: 10, step: 'Verifying authentication...' },
  STATS: { progress: 30, step: 'Loading dashboard statistics...' },
  DETAILED: { progress: 60, step: 'Fetching detailed student reports...' },
  CHARTS: { progress: 80, step: 'Preparing charts and analytics...' },
  FINAL: { progress: 95, step: 'Finalizing dashboard...' },
  COMPLETE: { progress: 100, step: 'Dashboard ready!' },
};

export default function LoadingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(LOADING_STEPS.AUTH.step);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Step 1: Auth verification
        setProgress(LOADING_STEPS.AUTH.progress);
        setCurrentStep(LOADING_STEPS.AUTH.step);
        
        const authResponse = await fetch('/api/auth/me');
        if (!authResponse.ok) {
          router.push('/login');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 200));

        // Step 2: Fetch dashboard stats
        setProgress(LOADING_STEPS.STATS.progress);
        setCurrentStep(LOADING_STEPS.STATS.step);
        
        const dashboardResponse = await fetch('/api/dashboard');
        if (!dashboardResponse.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const dashboardJson = await dashboardResponse.json();
        
        if (!dashboardJson.success) {
          throw new Error(dashboardJson.error || 'Failed to fetch dashboard data');
        }

        // Store dashboard data in sessionStorage
        sessionStorage.setItem('dashboardData', JSON.stringify(dashboardJson.data));

        // Step 3: Fetch detailed students
        setProgress(LOADING_STEPS.DETAILED.progress);
        setCurrentStep(LOADING_STEPS.DETAILED.step);
        
        const detailedResponse = await fetch('/api/dashboard/detailed');
        if (!detailedResponse.ok) {
          throw new Error('Failed to fetch detailed student data');
        }
        const detailedJson = await detailedResponse.json();
        
        if (detailedJson.success) {
          sessionStorage.setItem('detailedStudents', JSON.stringify(detailedJson.data));
        }

        // Step 4: Charts and finalization
        setProgress(LOADING_STEPS.CHARTS.progress);
        setCurrentStep(LOADING_STEPS.CHARTS.step);
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 5: Complete and redirect
        setProgress(LOADING_STEPS.FINAL.progress);
        setCurrentStep(LOADING_STEPS.FINAL.step);
        await new Promise(resolve => setTimeout(resolve, 200));

        setProgress(LOADING_STEPS.COMPLETE.progress);
        setCurrentStep(LOADING_STEPS.COMPLETE.step);
        
        // Small delay to show 100% complete
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Redirect to dashboard
        router.push('/');
        
      } catch (err) {
        console.error('Loading error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setProgress(0);
        setCurrentStep('Error loading dashboard. Redirecting to login...');
        
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    };

    loadDashboardData();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-[#9ed2ac] to-[#9ed2ac] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/50 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Failed to Load Dashboard</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <p className="text-sm text-slate-500">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return <LoadingScreen progress={progress} currentStep={currentStep} />;
}
