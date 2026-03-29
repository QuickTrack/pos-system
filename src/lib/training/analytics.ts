export interface TrainingAnalytics {
  totalTutorials: number;
  completedTutorials: number;
  inProgressTutorials: number;
  totalTimeSpent: number; // in minutes
  averageCompletionTime: number; // in minutes
  lastActivity: Date | null;
  streak: number; // consecutive days
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  category: 'completion' | 'streak' | 'speed' | 'mastery';
}

export interface TutorialProgress {
  tutorialId: string;
  startedAt: Date;
  completedAt: Date | null;
  timeSpent: number; // in minutes
  stepsCompleted: number;
  totalSteps: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface UserEngagement {
  userId: string;
  sessions: TrainingSession[];
  totalSessions: number;
  averageSessionDuration: number; // in minutes
  lastSession: Date | null;
}

export interface TrainingSession {
  startTime: Date;
  endTime: Date | null;
  tutorialsStarted: string[];
  tutorialsCompleted: string[];
  actionsPerformed: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_tutorial',
    title: 'First Steps',
    description: 'Complete your first tutorial',
    icon: '🎯',
    unlockedAt: new Date(),
    category: 'completion',
  },
  {
    id: 'five_tutorials',
    title: 'Getting Started',
    description: 'Complete 5 tutorials',
    icon: '⭐',
    unlockedAt: new Date(),
    category: 'completion',
  },
  {
    id: 'ten_tutorials',
    title: 'Dedicated Learner',
    description: 'Complete 10 tutorials',
    icon: '🏆',
    unlockedAt: new Date(),
    category: 'completion',
  },
  {
    id: 'all_tutorials',
    title: 'Training Master',
    description: 'Complete all available tutorials',
    icon: '👑',
    unlockedAt: new Date(),
    category: 'mastery',
  },
  {
    id: 'three_day_streak',
    title: 'Consistent Learner',
    description: 'Train for 3 consecutive days',
    icon: '🔥',
    unlockedAt: new Date(),
    category: 'streak',
  },
  {
    id: 'seven_day_streak',
    title: 'Week Warrior',
    description: 'Train for 7 consecutive days',
    icon: '💪',
    unlockedAt: new Date(),
    category: 'streak',
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Complete a tutorial in under 5 minutes',
    icon: '⚡',
    unlockedAt: new Date(),
    category: 'speed',
  },
];

export class TrainingAnalyticsEngine {
  private progress: Map<string, TutorialProgress> = new Map();
  private sessions: TrainingSession[] = [];
  private achievements: Achievement[] = [];
  private currentSession: TrainingSession | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedProgress = localStorage.getItem('training_progress');
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        this.progress = new Map(Object.entries(parsed));
      }

      const savedSessions = localStorage.getItem('training_sessions');
      if (savedSessions) {
        this.sessions = JSON.parse(savedSessions);
      }

      const savedAchievements = localStorage.getItem('training_achievements');
      if (savedAchievements) {
        this.achievements = JSON.parse(savedAchievements);
      }
    } catch (error) {
      console.error('Failed to load training analytics:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        'training_progress',
        JSON.stringify(Object.fromEntries(this.progress))
      );
      localStorage.setItem('training_sessions', JSON.stringify(this.sessions));
      localStorage.setItem('training_achievements', JSON.stringify(this.achievements));
    } catch (error) {
      console.error('Failed to save training analytics:', error);
    }
  }

  startSession(): void {
    this.currentSession = {
      startTime: new Date(),
      endTime: null,
      tutorialsStarted: [],
      tutorialsCompleted: [],
      actionsPerformed: 0,
    };
  }

  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.sessions.push(this.currentSession);
      this.currentSession = null;
      this.saveToStorage();
    }
  }

  startTutorial(tutorialId: string, totalSteps: number): void {
    const existing = this.progress.get(tutorialId);
    if (existing && existing.status === 'completed') {
      return;
    }

    const progress: TutorialProgress = {
      tutorialId,
      startedAt: new Date(),
      completedAt: null,
      timeSpent: 0,
      stepsCompleted: 0,
      totalSteps,
      status: 'in_progress',
    };

    this.progress.set(tutorialId, progress);

    if (this.currentSession) {
      this.currentSession.tutorialsStarted.push(tutorialId);
    }

    this.saveToStorage();
  }

  completeStep(tutorialId: string): void {
    const progress = this.progress.get(tutorialId);
    if (!progress) return;

    progress.stepsCompleted += 1;
    progress.timeSpent = Math.floor(
      (new Date().getTime() - progress.startedAt.getTime()) / 60000
    );

    if (progress.stepsCompleted >= progress.totalSteps) {
      progress.status = 'completed';
      progress.completedAt = new Date();

      if (this.currentSession) {
        this.currentSession.tutorialsCompleted.push(tutorialId);
      }

      this.checkAchievements(progress);
    }

    this.progress.set(tutorialId, progress);
    this.saveToStorage();
  }

  recordAction(): void {
    if (this.currentSession) {
      this.currentSession.actionsPerformed += 1;
    }
  }

  private checkAchievements(progress: TutorialProgress): void {
    const completedCount = Array.from(this.progress.values()).filter(
      (p) => p.status === 'completed'
    ).length;

    // First tutorial
    if (completedCount === 1) {
      this.unlockAchievement('first_tutorial');
    }

    // 5 tutorials
    if (completedCount === 5) {
      this.unlockAchievement('five_tutorials');
    }

    // 10 tutorials
    if (completedCount === 10) {
      this.unlockAchievement('ten_tutorials');
    }

    // Speed demon (under 5 minutes)
    if (progress.timeSpent < 5) {
      this.unlockAchievement('speed_demon');
    }

    // Check streak
    this.checkStreak();
  }

  private checkStreak(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    const sortedSessions = [...this.sessions].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    for (let i = 0; i < sortedSessions.length; i++) {
      const sessionDate = new Date(sortedSessions[i].startTime);
      sessionDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (sessionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 3) {
      this.unlockAchievement('three_day_streak');
    }

    if (streak >= 7) {
      this.unlockAchievement('seven_day_streak');
    }
  }

  private unlockAchievement(achievementId: string): void {
    if (this.achievements.find((a) => a.id === achievementId)) {
      return;
    }

    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (achievement) {
      this.achievements.push({
        ...achievement,
        unlockedAt: new Date(),
      });
      this.saveToStorage();
    }
  }

  getAnalytics(totalTutorials: number): TrainingAnalytics {
    const completed = Array.from(this.progress.values()).filter(
      (p) => p.status === 'completed'
    );
    const inProgress = Array.from(this.progress.values()).filter(
      (p) => p.status === 'in_progress'
    );

    const totalTimeSpent = completed.reduce((sum, p) => sum + p.timeSpent, 0);
    const averageCompletionTime =
      completed.length > 0 ? totalTimeSpent / completed.length : 0;

    const lastActivity =
      this.sessions.length > 0
        ? new Date(Math.max(...this.sessions.map((s) => new Date(s.startTime).getTime())))
        : null;

    return {
      totalTutorials,
      completedTutorials: completed.length,
      inProgressTutorials: inProgress.length,
      totalTimeSpent,
      averageCompletionTime,
      lastActivity,
      streak: this.calculateStreak(),
      achievements: this.achievements,
    };
  }

  private calculateStreak(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    const sortedSessions = [...this.sessions].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    for (let i = 0; i < sortedSessions.length; i++) {
      const sessionDate = new Date(sortedSessions[i].startTime);
      sessionDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (sessionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  getProgress(tutorialId: string): TutorialProgress | undefined {
    return this.progress.get(tutorialId);
  }

  getAllProgress(): TutorialProgress[] {
    return Array.from(this.progress.values());
  }

  getAchievements(): Achievement[] {
    return this.achievements;
  }

  reset(): void {
    this.progress.clear();
    this.sessions = [];
    this.achievements = [];
    this.currentSession = null;
    this.saveToStorage();
  }
}

// Singleton instance
let analyticsInstance: TrainingAnalyticsEngine | null = null;

export function getTrainingAnalytics(): TrainingAnalyticsEngine {
  if (!analyticsInstance) {
    analyticsInstance = new TrainingAnalyticsEngine();
  }
  return analyticsInstance;
}
