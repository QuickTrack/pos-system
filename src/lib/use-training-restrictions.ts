'use client';

import { useTraining } from './training-context';

export type RestrictedAction = 
  | 'real_payment'
  | 'email_send'
  | 'sms_send'
  | 'print_official'
  | 'export_data'
  | 'delete_permanent'
  | 'modify_settings';

interface RestrictionConfig {
  action: RestrictedAction;
  message: string;
  simulatedMessage?: string;
}

const RESTRICTIONS: RestrictionConfig[] = [
  {
    action: 'real_payment',
    message: 'Real payments are disabled in Training Mode',
    simulatedMessage: 'Payment simulated successfully! (No real transaction occurred)',
  },
  {
    action: 'email_send',
    message: 'Email sending is disabled in Training Mode',
    simulatedMessage: 'Email simulated successfully! (No email was actually sent)',
  },
  {
    action: 'sms_send',
    message: 'SMS sending is disabled in Training Mode',
    simulatedMessage: 'SMS simulated successfully! (No SMS was actually sent)',
  },
  {
    action: 'print_official',
    message: 'Printing official documents is disabled in Training Mode',
    simulatedMessage: 'Document preview shown (Printing disabled in Training Mode)',
  },
  {
    action: 'export_data',
    message: 'Data export is disabled in Training Mode',
    simulatedMessage: 'Export simulated successfully! (No data was actually exported)',
  },
  {
    action: 'delete_permanent',
    message: 'Permanent deletion is disabled in Training Mode',
    simulatedMessage: 'Deletion simulated successfully! (Data remains in training database)',
  },
  {
    action: 'modify_settings',
    message: 'System settings modification is disabled in Training Mode',
    simulatedMessage: 'Settings change simulated successfully! (No actual settings were modified)',
  },
];

export function useTrainingRestrictions() {
  const { isTrainingMode } = useTraining();

  const isRestricted = (action: RestrictedAction): boolean => {
    return isTrainingMode;
  };

  const getRestrictionMessage = (action: RestrictedAction): string => {
    const restriction = RESTRICTIONS.find(r => r.action === action);
    return restriction?.message || 'This action is disabled in Training Mode';
  };

  const getSimulatedMessage = (action: RestrictedAction): string => {
    const restriction = RESTRICTIONS.find(r => r.action === action);
    return restriction?.simulatedMessage || 'Action simulated successfully!';
  };

  const executeWithRestriction = async <T>(
    action: RestrictedAction,
    realAction: () => Promise<T>,
    simulatedAction?: () => Promise<T> | T
  ): Promise<{ success: boolean; data?: T; message: string; isSimulated: boolean }> => {
    if (!isTrainingMode) {
      try {
        const data = await realAction();
        return { success: true, data, message: 'Action completed successfully', isSimulated: false };
      } catch (error) {
        return { success: false, message: 'Action failed', isSimulated: false };
      }
    }

    // In training mode, execute simulated action or return simulated message
    if (simulatedAction) {
      try {
        const data = await simulatedAction();
        return { 
          success: true, 
          data, 
          message: getSimulatedMessage(action), 
          isSimulated: true 
        };
      } catch (error) {
        return { success: false, message: 'Simulated action failed', isSimulated: true };
      }
    }

    return { 
      success: true, 
      message: getSimulatedMessage(action), 
      isSimulated: true 
    };
  };

  return {
    isTrainingMode,
    isRestricted,
    getRestrictionMessage,
    getSimulatedMessage,
    executeWithRestriction,
  };
}
