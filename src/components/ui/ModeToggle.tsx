'use client';

import { useTraining } from '@/lib/training-context';
import { Toggle } from './Toggle';
import { BookOpen, Zap } from 'lucide-react';

export function ModeToggle() {
  const { isTrainingMode, toggleTrainingMode } = useTraining();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Zap className={`w-4 h-4 ${!isTrainingMode ? 'text-emerald-600' : 'text-gray-400'}`} />
        <span className={`text-sm font-medium ${!isTrainingMode ? 'text-emerald-600' : 'text-gray-500'}`}>
          Live
        </span>
      </div>
      
      <Toggle
        checked={isTrainingMode}
        onChange={toggleTrainingMode}
        className="data-[state=checked]:bg-amber-500"
      />
      
      <div className="flex items-center gap-2">
        <BookOpen className={`w-4 h-4 ${isTrainingMode ? 'text-amber-600' : 'text-gray-400'}`} />
        <span className={`text-sm font-medium ${isTrainingMode ? 'text-amber-600' : 'text-gray-500'}`}>
          Training
        </span>
      </div>
    </div>
  );
}
