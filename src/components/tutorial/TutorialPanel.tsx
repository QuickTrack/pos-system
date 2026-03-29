'use client';

import { useTutorial } from '@/lib/tutorial-context';
import { useTraining } from '@/lib/training-context';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { BookOpen, Play, CheckCircle, Clock, Users, Package, FileText, DollarSign, BarChart3, RefreshCw } from 'lucide-react';

const categoryIcons: Record<string, any> = {
  sales: DollarSign,
  inventory: Package,
  invoices: FileText,
  payments: DollarSign,
  reports: BarChart3,
};

const categoryLabels: Record<string, string> = {
  sales: 'Sales',
  inventory: 'Inventory',
  invoices: 'Invoices',
  payments: 'Payments',
  reports: 'Reports',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  cashier: 'Cashier',
  store_manager: 'Store Manager',
  all: 'All Roles',
};

export function TutorialPanel() {
  const { tutorials, completedTutorials, startTutorial, resetTutorial, getTutorialsByCategory } = useTutorial();
  const { isTrainingMode } = useTraining();

  if (!isTrainingMode) {
    return null;
  }

  const categories = ['sales', 'inventory', 'invoices', 'payments', 'reports'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Tutorials</h2>
          <p className="text-gray-600 mt-1">
            Learn how to use the POS system with step-by-step guides
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <BookOpen className="w-4 h-4" />
          <span>{completedTutorials.length} of {tutorials.length} completed</span>
        </div>
      </div>

      {/* Progress overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Your Progress</h3>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(completedTutorials.length / tutorials.length) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {Math.round((completedTutorials.length / tutorials.length) * 100)}%
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tutorials by category */}
      {categories.map((category) => {
        const categoryTutorials = getTutorialsByCategory(category);
        if (categoryTutorials.length === 0) return null;

        const CategoryIcon = categoryIcons[category] || BookOpen;

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-4">
              <CategoryIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">{categoryLabels[category]}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryTutorials.map((tutorial) => {
                const isCompleted = completedTutorials.includes(tutorial.id);
                const TutorialIcon = categoryIcons[tutorial.category] || BookOpen;

                return (
                  <Card key={tutorial.id} className={`relative ${isCompleted ? 'border-emerald-200 bg-emerald-50' : ''}`}>
                    {isCompleted && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isCompleted ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}>
                          <TutorialIcon className={`w-5 h-5 ${isCompleted ? 'text-emerald-600' : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{tutorial.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{tutorial.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{tutorial.estimatedTime} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{roleLabels[tutorial.role]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{tutorial.steps.length} steps</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        {isCompleted ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetTutorial(tutorial.id)}
                              className="flex-1"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Reset
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => startTutorial(tutorial.id)}
                              className="flex-1"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Replay
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => startTutorial(tutorial.id)}
                            className="w-full"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start Tutorial
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
