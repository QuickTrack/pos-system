'use client';

import { useTutorial } from '@/lib/tutorial-context';
import { Button } from '@/components/ui/Button';
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export function TutorialOverlay() {
  const { currentTutorial, currentStepIndex, isTutorialActive, nextStep, previousStep, completeTutorial, exitTutorial } = useTutorial();
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  const currentStep = currentTutorial?.steps[currentStepIndex];

  // Update highlight position when step changes
  useEffect(() => {
    if (!currentStep?.targetElement) {
      setHighlightStyle({});
      return;
    }

    const updateHighlight = () => {
      const element = document.querySelector(currentStep.targetElement!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightStyle({
          position: 'fixed',
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          border: '3px solid #10b981',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          pointerEvents: 'none',
          zIndex: 9998,
          transition: 'all 0.3s ease',
        });
      }
    };

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight);

    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight);
    };
  }, [currentStep]);

  if (!isTutorialActive || !currentTutorial || !currentStep) {
    return null;
  }

  const isLastStep = currentStepIndex === currentTutorial.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const getTooltipPosition = () => {
    if (!currentStep.targetElement) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const element = document.querySelector(currentStep.targetElement);
    if (!element) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const rect = element.getBoundingClientRect();
    const position = currentStep.position || 'bottom';

    switch (position) {
      case 'top':
        return {
          top: rect.top - 120,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          top: rect.bottom + 20,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: rect.top + rect.height / 2,
          left: rect.left - 320,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          top: rect.top + rect.height / 2,
          left: rect.right + 20,
          transform: 'translateY(-50%)',
        };
      default:
        return {
          top: rect.bottom + 20,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        };
    }
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9997]"
        onClick={exitTutorial}
      />

      {/* Highlight box */}
      <div style={highlightStyle} />

      {/* Tutorial tooltip */}
      <div
        className="fixed z-[9999] w-80 bg-white rounded-lg shadow-2xl border border-gray-200"
        style={tooltipPosition}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-sm">{currentStepIndex + 1}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentStep.title}</h3>
              <p className="text-xs text-gray-500">
                Step {currentStepIndex + 1} of {currentTutorial.steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={exitTutorial}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-700 mb-4">{currentStep.description}</p>
          
          {currentStep.actionText && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg mb-4">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-blue-700">{currentStep.actionText}</p>
            </div>
          )}

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(((currentStepIndex + 1) / currentTutorial.steps.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / currentTutorial.steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={previousStep}
            disabled={isFirstStep}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          {isLastStep ? (
            <Button
              variant="primary"
              size="sm"
              onClick={completeTutorial}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Complete
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={nextStep}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
