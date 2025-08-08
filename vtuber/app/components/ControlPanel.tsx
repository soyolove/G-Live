import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Link, 
  FolderOpen,
  ZoomIn,
  MousePointer,
  Loader2
} from 'lucide-react';
import type { Live2DModelInstance } from '../lib/types';

interface LocalModel {
  name: string;
  path: string;
  type: 'cubism2' | 'cubism4';
}

interface ControlPanelProps {
  currentModel: Live2DModelInstance | null;
  modelScale: number;
  mouseTracking: boolean;
  localModels: LocalModel[];
  onScaleChange: (scale: number) => void;
  onMouseTrackingChange: (enabled: boolean) => void;
  onLoadUrl: (url: string) => void;
  onLoadLocalModel: (path: string) => void;
}

export default function ControlPanel({
  currentModel,
  modelScale,
  mouseTracking,
  localModels,
  onScaleChange,
  onMouseTrackingChange,
  onLoadUrl,
  onLoadLocalModel,
}: ControlPanelProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadUrl = async () => {
    if (url.trim()) {
      setIsLoading(true);
      try {
        onLoadUrl(url);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Card className="w-80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Model Controls
          {currentModel && (
            <Badge variant="secondary" className="ml-auto">
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure and load Live2D models
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Scale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="scale" className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              Scale
            </Label>
            <span className="text-sm text-muted-foreground">
              {(modelScale * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            id="scale"
            min={10}
            max={200}
            step={5}
            value={[modelScale * 100]}
            onValueChange={([value]) => onScaleChange(value / 100)}
            disabled={!currentModel}
            className="w-full"
          />
        </div>

        {/* Mouse Tracking */}
        <div className="flex items-center justify-between">
          <Label htmlFor="tracking" className="flex items-center gap-2">
            <MousePointer className="h-4 w-4" />
            Mouse Tracking
          </Label>
          <Switch
            id="tracking"
            checked={mouseTracking}
            onCheckedChange={onMouseTrackingChange}
            disabled={true}
          />
        </div>

        {/* Load from URL */}
        <div className="space-y-2">
          <Label htmlFor="url" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Load from URL
          </Label>
          <div className="flex gap-2">
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/model.json"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
              className="flex-1"
            />
            <Button 
              onClick={handleLoadUrl}
              disabled={!url.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Local Models */}
        {localModels.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Local Models
            </Label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {localModels.map((model) => (
                <Button
                  key={model.path}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => onLoadLocalModel(model.path)}
                >
                  <Badge 
                    variant={model.type === 'cubism4' ? 'default' : 'secondary'}
                    className="mr-2 text-xs"
                  >
                    {model.type}
                  </Badge>
                  {model.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}