export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'input' | 'none';
  validation?: () => boolean;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
  category: string;
  estimatedTime: number;
  prerequisites?: string[];
}

export interface TutorialProgress {
  tutorialId: string;
  currentStep: number;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export class TutorialEngine {
  private tutorials: Map<string, Tutorial> = new Map();
  private progress: Map<string, TutorialProgress> = new Map();
  private activeTutorial: string | null = null;
  private onProgressChange?: (progress: TutorialProgress) => void;

  constructor(onProgressChange?: (progress: TutorialProgress) => void) {
    this.onProgressChange = onProgressChange;
  }

  registerTutorial(tutorial: Tutorial): void {
    this.tutorials.set(tutorial.id, tutorial);
  }

  registerTutorials(tutorials: Tutorial[]): void {
    tutorials.forEach(tutorial => this.registerTutorial(tutorial));
  }

  startTutorial(tutorialId: string): boolean {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) return false;

    const progress: TutorialProgress = {
      tutorialId,
      currentStep: 0,
      completed: false,
      startedAt: new Date(),
    };

    this.progress.set(tutorialId, progress);
    this.activeTutorial = tutorialId;
    this.onProgressChange?.(progress);

    return true;
  }

  nextStep(): TutorialStep | null {
    if (!this.activeTutorial) return null;

    const tutorial = this.tutorials.get(this.activeTutorial);
    const progress = this.progress.get(this.activeTutorial);

    if (!tutorial || !progress) return null;

    const nextStepIndex = progress.currentStep + 1;

    if (nextStepIndex >= tutorial.steps.length) {
      this.completeTutorial();
      return null;
    }

    progress.currentStep = nextStepIndex;
    this.progress.set(this.activeTutorial, progress);
    this.onProgressChange?.(progress);

    return tutorial.steps[nextStepIndex];
  }

  previousStep(): TutorialStep | null {
    if (!this.activeTutorial) return null;

    const tutorial = this.tutorials.get(this.activeTutorial);
    const progress = this.progress.get(this.activeTutorial);

    if (!tutorial || !progress) return null;

    const prevStepIndex = progress.currentStep - 1;

    if (prevStepIndex < 0) return null;

    progress.currentStep = prevStepIndex;
    this.progress.set(this.activeTutorial, progress);
    this.onProgressChange?.(progress);

    return tutorial.steps[prevStepIndex];
  }

  getCurrentStep(): TutorialStep | null {
    if (!this.activeTutorial) return null;

    const tutorial = this.tutorials.get(this.activeTutorial);
    const progress = this.progress.get(this.activeTutorial);

    if (!tutorial || !progress) return null;

    return tutorial.steps[progress.currentStep] || null;
  }

  completeTutorial(): void {
    if (!this.activeTutorial) return;

    const progress = this.progress.get(this.activeTutorial);
    if (progress) {
      progress.completed = true;
      progress.completedAt = new Date();
      this.progress.set(this.activeTutorial, progress);
      this.onProgressChange?.(progress);
    }

    this.activeTutorial = null;
  }

  exitTutorial(): void {
    this.activeTutorial = null;
  }

  getProgress(tutorialId: string): TutorialProgress | undefined {
    return this.progress.get(tutorialId);
  }

  getAllProgress(): TutorialProgress[] {
    return Array.from(this.progress.values());
  }

  getActiveTutorial(): string | null {
    return this.activeTutorial;
  }

  getTutorial(tutorialId: string): Tutorial | undefined {
    return this.tutorials.get(tutorialId);
  }

  getAllTutorials(): Tutorial[] {
    return Array.from(this.tutorials.values());
  }

  isTutorialCompleted(tutorialId: string): boolean {
    const progress = this.progress.get(tutorialId);
    return progress?.completed || false;
  }

  resetProgress(tutorialId?: string): void {
    if (tutorialId) {
      this.progress.delete(tutorialId);
    } else {
      this.progress.clear();
    }
    this.activeTutorial = null;
  }
}

// Singleton instance
let tutorialEngineInstance: TutorialEngine | null = null;

export function getTutorialEngine(): TutorialEngine {
  if (!tutorialEngineInstance) {
    tutorialEngineInstance = new TutorialEngine();
  }
  return tutorialEngineInstance;
}
