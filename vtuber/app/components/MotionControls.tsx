import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Play, Smile, Activity, ChevronUp, ChevronDown } from 'lucide-react';
import type { Live2DModelInstance } from '../lib/types';

interface MotionControlsProps {
  currentModel: Live2DModelInstance | null;
  currentMotion: { group: string; index: number } | null;
  motionProgress: number;
  onPlayMotion: (group: string, index: number) => void;
}

export function MotionControls({
  currentModel,
  currentMotion,
  motionProgress,
  onPlayMotion,
}: MotionControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!currentModel) return null;

  const motionGroups = Object.entries(
    currentModel.internalModel.motionManager.definitions
  );
  
  const expressions = (currentModel.internalModel.motionManager.expressionManager as any)?.expressions || [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="w-80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Animations
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </CardTitle>
            {!isOpen && currentMotion && (
              <CardDescription className="text-xs">
                Playing: {currentMotion.group || 'Default'} #{currentMotion.index + 1}
              </CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <Tabs defaultValue="motions" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="motions" className="flex items-center gap-1 text-xs">
                  <Play className="h-3 w-3" />
                  Motions
                </TabsTrigger>
                <TabsTrigger value="expressions" className="flex items-center gap-1 text-xs">
                  <Smile className="h-3 w-3" />
                  Expressions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="motions" className="mt-3">
                <ScrollArea className="h-[250px] pr-3">
                  <div className="space-y-3">
                    {motionGroups.map(([groupName, motions]) => (
                      <div key={groupName} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs h-5">
                            {groupName || 'Default'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(motions as any[]).length} motion{(motions as any[]).length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {(motions as any[])?.map((motion, index) => {
                            const isActive = currentMotion?.group === groupName && currentMotion?.index === index;
                            const motionName = (motion.file || motion.File || `Motion ${index + 1}`)
                              .replace('.mtn', '')
                              .replace('.motion3.json', '');

                            return (
                              <div key={`${groupName}-${index}`} className="relative">
                                <Button
                                  variant={isActive ? "secondary" : "ghost"}
                                  size="sm"
                                  className="w-full justify-start text-left h-7 text-xs"
                                  onClick={() => onPlayMotion(groupName, index)}
                                >
                                  <Play className="h-3 w-3 mr-1.5" />
                                  {motionName}
                                </Button>
                                {isActive && (
                                  <Progress 
                                    value={motionProgress * 100} 
                                    className="absolute bottom-0 left-0 right-0 h-0.5"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="expressions" className="mt-3">
                <ScrollArea className="h-[250px] pr-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {expressions.map((expression: any, index: number) => {
                      const expressionName = (expression.file || expression.File || `Expression ${index + 1}`)
                        .replace('.exp.json', '')
                        .replace('.exp3.json', '');

                      return (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => currentModel.expression(index)}
                          className="justify-start h-7 text-xs"
                        >
                          <Smile className="h-3 w-3 mr-1.5" />
                          {expressionName}
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}