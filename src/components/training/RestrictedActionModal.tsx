'use client';

import { useTraining } from '@/lib/training-context';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, X } from 'lucide-react';

export function RestrictedActionModal() {
  const { showRestrictedModal, restrictedAction, closeRestrictedModal } = useTraining();

  if (!showRestrictedModal || !restrictedAction) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeRestrictedModal}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Action Restricted</h2>
          </div>
          <button
            onClick={closeRestrictedModal}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {restrictedAction.name}
            </h3>
            <p className="text-gray-600">
              {restrictedAction.description}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Training Mode Active</p>
                <p className="text-sm text-amber-700 mt-1">
                  This action is disabled while in Training Mode to prevent accidental operations. 
                  Switch to Live Mode to perform real transactions.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Tip:</strong> Use Training Mode to practice and learn the system without affecting real data.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={closeRestrictedModal}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            I Understand
          </Button>
        </div>
      </div>
    </div>
  );
}
