'use client';

import { useTraining } from '@/lib/training-context';
import { AlertTriangle, BookOpen, RefreshCw } from 'lucide-react';

export function TrainingModeBanner() {
  const { isTrainingMode, resetTrainingData } = useTraining();

  if (!isTrainingMode) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <span className="font-bold text-lg">Training Mode Active</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-amber-100">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">
              Real payments, emails, and official documents are disabled
            </span>
          </div>
        </div>
        <button
          onClick={resetTrainingData}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Reset Demo Data
        </button>
      </div>
    </div>
  );
}
