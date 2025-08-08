import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SSEConfig } from './SSEConfig';
import type { Live2DControlMethods } from '../hooks/useLive2DControl';
import {
  Eye,
  Hand,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  Target,
  Wifi
} from 'lucide-react';

interface ManualControlsProps {
  controls: Live2DControlMethods;
  sseConnected?: boolean;
  onSSEToggle?: (enabled: boolean) => void;
  sseEnabled?: boolean;
  sseUrl?: string;
  onSSEUrlChange?: (url: string) => void;
}

export function ManualControls({ 
  controls, 
  sseConnected = false,
  onSSEToggle,
  sseEnabled = false,
  sseUrl = 'http://localhost:8011/sse',
  onSSEUrlChange
}: ManualControlsProps) {
  const [lookX, setLookX] = useState(0);
  const [lookY, setLookY] = useState(0);

  const handleXChange = (value: number) => {
    setLookX(value);
    controls.lookAt(value, lookY);
  };
  
  const handleYChange = (value: number) => {
    setLookY(value);
    controls.lookAt(lookX, value);
  };

  const handleTap = (area: string) => {
    const positions: Record<string, [number, number]> = {
      head: [0, 0.5],
      chest: [0, 0],
      left: [-0.5, 0],
      right: [0.5, 0],
    };
    
    const [x, y] = positions[area] || [0, 0];
    controls.tap(x, y);
  };

  // Direction button component
  const DirectionButton = ({ 
    x, 
    y, 
    icon: Icon 
  }: { 
    x: number; 
    y: number; 
    icon: React.ComponentType<{ className?: string }> 
  }) => (
    <Button
      variant="outline"
      size="icon"
      className="h-10 w-10"
      onClick={() => controls.lookAt(x, y)}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <Card className="w-96 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Live2D Controls
        </CardTitle>
        <CardDescription>
          Control model behavior manually or via SSE
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Hand className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="remote" className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Remote
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-6">
            {/* Look At Controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <Label>Look Direction</Label>
              </div>

              {/* Quick Direction Grid */}
              <div className="grid grid-cols-3 gap-2">
                <DirectionButton x={-1} y={1} icon={ArrowUpLeft} />
                <DirectionButton x={0} y={1} icon={ArrowUp} />
                <DirectionButton x={1} y={1} icon={ArrowUpRight} />
                <DirectionButton x={-1} y={0} icon={ArrowLeft} />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => controls.resetFocus()}
                >
                  <Target className="h-4 w-4" />
                </Button>
                <DirectionButton x={1} y={0} icon={ArrowRight} />
                <DirectionButton x={-1} y={-1} icon={ArrowDownLeft} />
                <DirectionButton x={0} y={-1} icon={ArrowDown} />
                <DirectionButton x={1} y={-1} icon={ArrowDownRight} />
              </div>

              <Separator />

              {/* Fine Control Sliders */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Horizontal (X)</Label>
                    <Badge variant="secondary">{lookX.toFixed(1)}</Badge>
                  </div>
                  <Slider
                    value={[lookX]}
                    onValueChange={([value]) => handleXChange(value)}
                    min={-1}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Vertical (Y)</Label>
                    <Badge variant="secondary">{lookY.toFixed(1)}</Badge>
                  </div>
                  <Slider
                    value={[lookY]}
                    onValueChange={([value]) => handleYChange(value)}
                    min={-1}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Tap Areas */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Hand className="h-4 w-4" />
                Tap Areas
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTap('head')}
                >
                  Head
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTap('chest')}
                >
                  Chest
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTap('left')}
                >
                  Left Side
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTap('right')}
                >
                  Right Side
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="remote" className="space-y-4">
            {onSSEToggle && (
              <SSEConfig
                sseUrl={sseUrl}
                onUrlChange={onSSEUrlChange || (() => {})}
                enabled={sseEnabled}
                onEnabledChange={onSSEToggle}
                connected={sseConnected}
              />
            )}
            
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">Remote Control API</p>
              <p className="text-muted-foreground">
                Send HTTP POST requests to the backend to control the model remotely.
              </p>
              <div className="mt-3 space-y-1 font-mono text-xs">
                <p>POST /api/control/look</p>
                <p>POST /api/control/expression</p>
                <p>POST /api/control/motion</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}