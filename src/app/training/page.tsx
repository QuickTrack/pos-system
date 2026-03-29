'use client';

import { Header } from '@/components/layout/Header';
import { TutorialPanel } from '@/components/tutorial/TutorialPanel';
import { useTraining } from '@/lib/training-context';
import { Button } from '@/components/ui/Button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function TrainingPage() {
  const { isTrainingMode, resetTrainingData } = useTraining();
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetTrainingData();
      setShowResetConfirm(false);
    } catch (error) {
      console.error('Failed to reset training data:', error);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isTrainingMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Training Mode" subtitle="Practice and learn the system" />
        <div className="p-6">
          <div className="max-w-2xl mx-auto text-center py-12">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Training Mode Not Active</h2>
            <p className="text-gray-600 mb-6">
              Please enable Training Mode from the header to access training features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Training Mode" subtitle="Practice and learn the system" />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Reset Section */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reset Training Data</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Reset all training data to its initial state. This will clear all sales, purchases, and transactions made in training mode.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(true)}
                disabled={isResetting}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                Reset Data
              </Button>
            </div>
          </div>

          {/* Reset Confirmation Modal */}
          {showResetConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Reset Training Data?</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  This will permanently delete all training data including sales, purchases, invoices, and payments. 
                  This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowResetConfirm(false)}
                    disabled={isResetting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleReset}
                    disabled={isResetting}
                  >
                    {isResetting ? 'Resetting...' : 'Reset Data'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tutorial Panel */}
          <TutorialPanel />
        </div>
      </div>
    </div>
  );
}
