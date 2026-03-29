'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTraining } from '@/lib/training-context';
import { 
  getSimulationEngine, 
  SimulatedActivity, 
  SimulationConfig 
} from '@/lib/training/simulation-engine';

export function useSimulationEngine() {
  const { isTrainingMode } = useTraining();
  const [activities, setActivities] = useState<SimulatedActivity[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<SimulationConfig | null>(null);

  const engine = getSimulationEngine();

  useEffect(() => {
    if (isTrainingMode) {
      engine.start();
      setIsRunning(true);
      setConfig(engine.getConfig());
      
      // Update activities periodically
      const interval = setInterval(() => {
        setActivities(engine.getRecentActivities(20));
      }, 5000);

      return () => {
        clearInterval(interval);
        engine.stop();
        setIsRunning(false);
      };
    } else {
      engine.stop();
      setIsRunning(false);
      setActivities([]);
    }
  }, [isTrainingMode]);

  const generateActivities = useCallback(() => {
    const newActivities = engine.generateActivities();
    setActivities(engine.getRecentActivities(20));
    return newActivities;
  }, []);

  const clearActivities = useCallback(() => {
    engine.clearActivities();
    setActivities([]);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<SimulationConfig>) => {
    engine.updateConfig(newConfig);
    setConfig(engine.getConfig());
  }, []);

  const getRecentActivities = useCallback((count: number = 10) => {
    return engine.getRecentActivities(count);
  }, []);

  return {
    activities,
    isRunning,
    config,
    generateActivities,
    clearActivities,
    updateConfig,
    getRecentActivities,
  };
}
