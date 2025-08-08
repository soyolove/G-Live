import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Pencil, Check, X, Wifi, WifiOff } from 'lucide-react';

interface SSEConfigProps {
  sseUrl: string;
  onUrlChange: (url: string) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  connected: boolean;
}

export function SSEConfig({ 
  sseUrl, 
  onUrlChange, 
  enabled, 
  onEnabledChange,
  connected 
}: SSEConfigProps) {
  const [editingUrl, setEditingUrl] = useState(sseUrl);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUrlChange(editingUrl);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingUrl(sseUrl);
    setIsEditing(false);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">SSE Connection</Label>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
            disabled={isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Backend URL</Label>
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={editingUrl}
                onChange={(e) => setEditingUrl(e.target.value)}
                placeholder="http://localhost:3002/sse"
                className="flex-1"
              />
              <Button
                size="icon"
                variant="default"
                className="h-9 w-9"
                onClick={handleSave}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm flex-1">
                {sseUrl}
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {enabled && (
          <div className="flex items-center gap-2">
            <Badge 
              variant={connected ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {connected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </>
              )}
            </Badge>
            {!connected && (
              <span className="text-xs text-muted-foreground">
                Connecting...
              </span>
            )}
          </div>
        )}
      </div>

      {enabled && !connected && (
        <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
          <p className="text-muted-foreground">
            Ensure the backend server is running at:
          </p>
          <code className="text-xs">{sseUrl}</code>
        </div>
      )}
    </Card>
  );
}