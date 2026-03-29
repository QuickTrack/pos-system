'use client';

import { useTraining } from '@/lib/training-context';
import { cn } from '@/lib/utils';

interface TrainingBadgeProps {
  className?: string;
  variant?: 'default' | 'small' | 'large';
}

export function TrainingBadge({ className, variant = 'default' }: TrainingBadgeProps) {
  const { isTrainingMode } = useTraining();

  if (!isTrainingMode) return null;

  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    default: 'px-3 py-1 text-sm',
    large: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
        'shadow-lg shadow-amber-500/30',
        'animate-pulse',
        sizeClasses[variant],
        className
      )}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
      Practice Mode
    </span>
  );
}

export function TrainingBadgeSmall({ className }: { className?: string }) {
  return <TrainingBadge variant="small" className={className} />;
}

export function TrainingBadgeLarge({ className }: { className?: string }) {
  return <TrainingBadge variant="large" className={className} />;
}
