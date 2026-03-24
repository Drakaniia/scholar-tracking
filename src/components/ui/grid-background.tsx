import { GridPattern } from './grid-pattern';

interface GridBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function GridBackground({ children, className = '' }: GridBackgroundProps) {
  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-gradient-to-r from-[#fefdfb] to-[#fefdfb] ${className}`}
    >
      {/* GridPattern background */}
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <GridPattern />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
