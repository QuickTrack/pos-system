'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTraining } from '@/lib/training-context';
import { 
  getTrainingAnalytics, 
  TrainingAnalytics, 
  TutorialProgress,
  Achievement 
} from '@/lib/training/analytics';

export function useTrainingAnalytics() {
  const { isTrainingMode } = useTraining();
  const analyticsEngine = getTrainingAnalytics();
  
  // Use refs to track engine state to avoid setState in effects
  const engineStarted = React.useRef(false);

  const [analytics, setAnalytics] = useState<TrainingAnalytics | null>(null);
  const [progress, setProgress] = useState<TutorialProgress[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (isTrainingMode) {
      analyticsEngine.startSession();
      engineStarted.current = true;
      
      // Update analytics periodically
      const interval = setInterval(() => {
        const analyticsData = analyticsEngine.getAnalytics(10); // Fixed number of tutorials
        setAnalytics(analyticsData);
        setProgress(analyticsEngine.getAllProgress());
        setAchievements(analyticsEngine.getAchievements());
      }, 5000);

      return () => {
        clearInterval(interval);
        analyticsEngine.endSession();
      };
    } else if (engineStarted.current) {
      engineStarted.current = false;
      analyticsEngine.endSession();
    }
  }, [isTrainingMode]);

  const startTutorial = useCallback((tutorialId: string, totalSteps: number) => {
    analyticsEngine.startTutorial(tutorialId, totalSteps);
    const analyticsData = analyticsEngine.getAnalytics(10); // Fixed number of tutorials
    setAnalytics(analyticsData);
    setProgress(analyticsEngine.getAllProgress());
  }, []);

  const completeStep = useCallback((tutorialId: string) => {
    analyticsEngine.completeStep(tutorialId);
    const analyticsData = analyticsEngine.getAnalytics(10); // Fixed number of tutorials
    setAnalytics(analyticsData);
    setProgress(analyticsEngine.getAllProgress());
    setAchievements(analyticsEngine.getAchievements());
  }, []);

  const recordAction = useCallback(() => {
    analyticsEngine.recordAction();
  }, []);

  const getTutorialProgress = useCallback((tutorialId: string) => {
    return analyticsEngine.getProgress(tutorialId);
  }, []);

  const resetAnalytics = useCallback(() => {
    analyticsEngine.reset();
    const analyticsData = analyticsEngine.getAnalytics(10); // Fixed number of tutorials
    setAnalytics(analyticsData);
    setProgress([]);
    setAchievements([]);
  }, []);

  return {
    analytics,
    progress,
    achievements,
    startTutorial,
    completeStep,
    recordAction,
    getTutorialProgress,
    resetAnalytics,
  };
}
