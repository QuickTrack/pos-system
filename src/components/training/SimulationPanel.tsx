'use client';

import { useState } from 'react';
import { useSimulationEngine } from '@/hooks/useSimulationEngine';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Trash2, 
  Settings, 
  Activity,
  ShoppingCart,
  Package,
  Users,
  CreditCard
} from 'lucide-react';
import { SimulationConfig } from '@/lib/training/simulation-engine';

const activityIcons = {
  sale: ShoppingCart,
  inventory_movement: Package,
  customer_interaction: Users,
  payment: CreditCard,
};

const activityColors = {
  sale: 'bg-green-100 text-green-800',
  inventory_movement: 'bg-blue-100 text-blue-800',
  customer_interaction: 'bg-purple-100 text-purple-800',
  payment: 'bg-orange-100 text-orange-800',
};

export function SimulationPanel() {
  const {
    activities,
    isRunning,
    config,
    generateActivities,
    clearActivities,
    updateConfig,
  } = useSimulationEngine();

  const [showSettings, setShowSettings] = useState(false);
  const [localConfig, setLocalConfig] = useState<Partial<SimulationConfig>>({});

  const handleConfigChange = (key: keyof SimulationConfig, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
  };

  const applyConfig = () => {
    updateConfig(localConfig);
    setShowSettings(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activity Simulation
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={isRunning ? 'default' : 'secondary'}>
            {isRunning ? 'Running' : 'Stopped'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showSettings ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <select
                value={localConfig.frequency || config?.frequency || 'daily'}
                onChange={(e) => handleConfigChange('frequency', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Intensity</label>
              <select
                value={localConfig.intensity || config?.intensity || 'medium'}
                onChange={(e) => handleConfigChange('intensity', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyConfig} size="sm">
                Apply
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSettings(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateActivities}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearActivities}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activities yet. Click Generate to create sample activities.
                </p>
              ) : (
                activities.map((activity) => {
                  const Icon = activityIcons[activity.type];
                  const colorClass = activityColors[activity.type];
                  
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-2 rounded-lg border"
                    >
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
