"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Square, 
  Volume2,
  Music,
  Loader2,
  AlertCircle
} from 'lucide-react';
import type { Live2DControlMethods } from '../hooks/useLive2DControl';
import type { Live2DModelInstance } from '../lib/types';

interface AudioControlsProps {
  controls: Live2DControlMethods;
  currentModel: Live2DModelInstance | null;
}

export function AudioControls({ controls, currentModel }: AudioControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [selectedExpression, setSelectedExpression] = useState<string>('');
  const [customAudioUrl, setCustomAudioUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 预设音频列表
  const presetAudios = [
    { name: 'Shit 4 U', file: '/shit4u.mp3' },
    // 可以添加更多预设音频
  ];

  // 在浏览器环境中初始化
  useEffect(() => {
    console.log('AudioControls mounted, model:', currentModel);
    if (currentModel) {
      console.log('Model has speak method:', !!currentModel.speak);
      console.log('Model has stopSpeaking method:', !!currentModel.stopSpeaking);
    }
  }, [currentModel]);

  // 获取模型的表情列表
  const getExpressions = () => {
    if (!currentModel?.internalModel?.motionManager?.expressionManager) {
      return [];
    }
    return currentModel.internalModel.motionManager.expressionManager.expressions || [];
  };

  const handlePlayAudio = async (audioUrl: string) => {
    if (!currentModel || isPlaying) return;

    setIsPlaying(true);
    setIsLoading(true);
    setError('');

    try {
      await controls.speak(audioUrl, {
        volume: volume / 100,
        expression: selectedExpression || undefined,
        resetExpression: true,
        crossOrigin: 'anonymous',
        onFinish: () => {
          setIsPlaying(false);
          console.log('Audio playback finished');
        },
        onError: (err) => {
          setError(err.message);
          setIsPlaying(false);
          console.error('Audio playback error:', err);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    controls.stopSpeaking();
    setIsPlaying(false);
  };

  const handlePlayCustom = () => {
    if (customAudioUrl.trim()) {
      handlePlayAudio(customAudioUrl.trim());
    }
  };

  const expressions = getExpressions();

  return (
    <Card className="w-80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Audio & Lipsync
          {isPlaying && (
            <Badge variant="secondary" className="ml-auto">
              Playing
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Play audio with lipsync animation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="volume" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Volume
            </Label>
            <span className="text-sm text-muted-foreground">
              {volume}%
            </span>
          </div>
          <Slider
            id="volume"
            min={0}
            max={100}
            step={5}
            value={[volume]}
            onValueChange={([value]) => setVolume(value)}
            className="w-full"
          />
        </div>

        {/* Expression Selection */}
        {expressions.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="expression">Expression (Optional)</Label>
            <Select value={selectedExpression} onValueChange={setSelectedExpression}>
              <SelectTrigger id="expression">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {expressions.map((expr: any, index: number) => (
                  <SelectItem key={index} value={String(index)}>
                    {expr.name || `Expression ${index}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Preset Audio Buttons */}
        <div className="space-y-2">
          <Label>Preset Audio</Label>
          <div className="space-y-2">
            {presetAudios.map((audio) => (
              <Button
                key={audio.file}
                onClick={() => handlePlayAudio(audio.file)}
                disabled={!currentModel || isPlaying}
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                {isLoading && isPlaying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {audio.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom URL Input */}
        <div className="space-y-2">
          <Label htmlFor="customUrl">Custom Audio URL</Label>
          <div className="flex gap-2">
            <Input
              id="customUrl"
              type="url"
              placeholder="https://example.com/audio.mp3"
              value={customAudioUrl}
              onChange={(e) => setCustomAudioUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePlayCustom()}
              className="flex-1"
            />
            <Button
              onClick={handlePlayCustom}
              disabled={!currentModel || isPlaying || !customAudioUrl.trim()}
              size="icon"
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stop Button */}
        {isPlaying && (
          <Button
            onClick={handleStop}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Info */}
        {!currentModel && (
          <p className="text-sm text-muted-foreground text-center">
            Load a model to enable audio playback
          </p>
        )}
      </CardContent>
    </Card>
  );
}