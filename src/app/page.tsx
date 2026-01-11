import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, Shield } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-6xl">
            Scholarship Tracking System
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Efficiently manage scholarships, applications, and student records.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 max-w-lg mx-auto pt-8">
          <Link href="/web/login">
            <Button size="lg" className="w-full h-32 flex flex-col gap-4 text-lg" variant="outline">
              <GraduationCap className="w-10 h-10" />
              Student Portal
            </Button>
          </Link>

          <Link href="/admin/login">
            <Button size="lg" className="w-full h-32 flex flex-col gap-4 text-lg" variant="outline">
              <Shield className="w-10 h-10" />
              Admin Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
