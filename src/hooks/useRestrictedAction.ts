'use client';

import { useTraining } from '@/lib/training-context';

interface RestrictedAction {
  name: string;
  description: string;
}

export function useRestrictedAction() {
  const { isTrainingMode, showRestrictedActionModal } = useTraining();

  const checkRestrictedAction = (action: RestrictedAction): boolean => {
    if (isTrainingMode) {
      showRestrictedActionModal(action);
      return true; // Action is restricted
    }
    return false; // Action is allowed
  };

  return { checkRestrictedAction, isTrainingMode };
}
