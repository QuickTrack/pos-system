'use client';

import { useTraining } from '@/lib/training-context';
import { AlertTriangle, BookOpen, RefreshCw } from 'lucide-react';

export function TrainingBanner() {
  const { isTrainingMode, currentTutorial, completedTutorials } = useTraining();

  if (!isTrainingMode) return null;

  const totalTutorials = 5; // Total number of tutorials
  const completedCount = completedTutorials.length;
  const progressPercent = Math.round((completedCount / totalTutorials) * 100);

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" />
        <div>
          <span className="font-semibold">Training Mode Active</span>
          {currentTutorial && (
            <span className="ml-2 text-amber-100">
              • Tutorial: {currentTutorial}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <span className="text-sm">
            {completedCount}/{totalTutorials} tutorials completed
          </span>
          <div className="w-24 h-2 bg-amber-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
