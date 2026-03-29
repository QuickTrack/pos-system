'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RestrictedAction {
  name: string;
  description: string;
}

interface TrainingContextType {
  isTrainingMode: boolean;
  toggleTrainingMode: () => void;
  setTrainingMode: (enabled: boolean) => void;
  trainingData: {
    products: any[];
    customers: any[];
    suppliers: any[];
    sales: any[];
    purchases: any[];
    invoices: any[];
  };
  setTrainingData: (data: any) => void;
  resetTrainingData: () => void;
  completedTutorials: string[];
  markTutorialComplete: (tutorialId: string) => void;
  currentTutorial: string | null;
  setCurrentTutorial: (tutorialId: string | null) => void;
  showRestrictedModal: boolean;
  restrictedAction: RestrictedAction | null;
  showRestrictedActionModal: (action: RestrictedAction) => void;
  closeRestrictedModal: () => void;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

const STORAGE_KEY = 'pos-training-mode';
const TRAINING_DATA_KEY = 'pos-training-data';
const TUTORIALS_KEY = 'pos-training-tutorials';

export function TrainingProvider({ children }: { children: ReactNode }) {
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [trainingData, setTrainingDataState] = useState<any>({
    products: [],
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],
    invoices: [],
  });
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);
  const [currentTutorial, setCurrentTutorial] = useState<string | null>(null);
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);
  const [restrictedAction, setRestrictedAction] = useState<RestrictedAction | null>(null);

  // Load training mode state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY);
      if (savedMode) {
        setIsTrainingMode(JSON.parse(savedMode));
      }

      const savedData = localStorage.getItem(TRAINING_DATA_KEY);
      if (savedData) {
        setTrainingDataState(JSON.parse(savedData));
      }

      const savedTutorials = localStorage.getItem(TUTORIALS_KEY);
      if (savedTutorials) {
        setCompletedTutorials(JSON.parse(savedTutorials));
      }
    } catch (error) {
      console.error('Failed to load training mode state:', error);
    }
  }, []);

  // Save training mode state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isTrainingMode));
    } catch (error) {
      console.error('Failed to save training mode state:', error);
    }
  }, [isTrainingMode]);

  // Save training data to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(TRAINING_DATA_KEY, JSON.stringify(trainingData));
    } catch (error) {
      console.error('Failed to save training data:', error);
    }
  }, [trainingData]);

  // Save completed tutorials to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(TUTORIALS_KEY, JSON.stringify(completedTutorials));
    } catch (error) {
      console.error('Failed to save completed tutorials:', error);
    }
  }, [completedTutorials]);

  const toggleTrainingMode = () => {
    if (!isTrainingMode) {
      // Switching to training mode - show confirmation
      if (window.confirm('Switch to Training Mode? This will use demo data and restrict certain actions.')) {
        setIsTrainingMode(true);
      }
    } else {
      // Switching to live mode - show confirmation
      if (window.confirm('Switch to Live Mode? This will use real data and enable all actions.')) {
        setIsTrainingMode(false);
      }
    }
  };

  const setTrainingMode = (enabled: boolean) => {
    setIsTrainingMode(enabled);
  };

  const setTrainingData = (data: any) => {
    setTrainingDataState(data);
  };

  const resetTrainingData = async () => {
    try {
      const response = await fetch('/api/training/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset training data');
      }

      // Reset local state
      setTrainingDataState({
        products: [],
        customers: [],
        suppliers: [],
        sales: [],
        purchases: [],
        invoices: [],
      });

      // Reset completed tutorials
      setCompletedTutorials([]);
      localStorage.removeItem(TUTORIALS_KEY);

      return { success: true };
    } catch (error) {
      console.error('Error resetting training data:', error);
      return { success: false, error: 'Failed to reset training data' };
    }
  };

  const markTutorialComplete = (tutorialId: string) => {
    if (!completedTutorials.includes(tutorialId)) {
      setCompletedTutorials([...completedTutorials, tutorialId]);
    }
  };

  const showRestrictedActionModal = (action: RestrictedAction) => {
    setRestrictedAction(action);
    setShowRestrictedModal(true);
  };

  const closeRestrictedModal = () => {
    setShowRestrictedModal(false);
    setRestrictedAction(null);
  };

  return (
    <TrainingContext.Provider
      value={{
        isTrainingMode,
        toggleTrainingMode,
        setTrainingMode,
        trainingData,
        setTrainingData,
        resetTrainingData,
        completedTutorials,
        markTutorialComplete,
        currentTutorial,
        setCurrentTutorial,
        showRestrictedModal,
        restrictedAction,
        showRestrictedActionModal,
        closeRestrictedModal,
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
}
