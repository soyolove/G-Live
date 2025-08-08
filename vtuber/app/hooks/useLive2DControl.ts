import { useCallback, useRef, useEffect, useMemo } from 'react';
import * as PIXI from 'pixi.js';
import type { Live2DModelInstance } from '../lib/types';

export interface Live2DControlMethods {
  lookAt: (x: number, y: number, instant?: boolean) => void;
  lookAtPosition: (screenX: number, screenY: number, instant?: boolean) => void;
  resetFocus: () => void;
  setExpression: (id: string | number) => Promise<void>;
  playMotion: (group: string, index: number, priority?: number) => Promise<void>;
  tap: (x: number, y: number) => void;
  speak: (audioUrl: string, options?: SpeakOptions) => Promise<void>;
  stopSpeaking: () => void;
}

interface SpeakOptions {
  volume?: number;
  expression?: string | number;
  resetExpression?: boolean;
  crossOrigin?: string;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}

interface UseLive2DControlProps {
  currentModel: Live2DModelInstance | null;
  app: PIXI.Application | null;
}

export function useLive2DControl({ currentModel, app }: UseLive2DControlProps): Live2DControlMethods {
  const modelRef = useRef<Live2DModelInstance | null>(null);

  useEffect(() => {
    modelRef.current = currentModel;
  }, [currentModel]);

  // Look at normalized coordinates (-1 to 1)
  const lookAt = useCallback((x: number, y: number, instant: boolean = false) => {
    const model = modelRef.current;
    if (!model || !model.internalModel.focusController) return;

    // Ensure the model has focus control enabled
    if (model.internalModel.focusController._originalUpdate) {
      model.internalModel.focusController.update = model.internalModel.focusController._originalUpdate;
    }

    // Use the focus method to set target position
    model.internalModel.focusController.focus(x, y, instant);
  }, []);

  // Look at screen position (converts screen coordinates to normalized)
  const lookAtPosition = useCallback((screenX: number, screenY: number, instant: boolean = false) => {
    if (!app || !modelRef.current) return;

    // Convert screen coordinates to normalized coordinates (-1 to 1)
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    
    // Normalize to -1 to 1 range
    const normalizedX = (screenX - centerX) / centerX;
    const normalizedY = (screenY - centerY) / centerY;

    lookAt(normalizedX, normalizedY, instant);
  }, [app, lookAt]);

  // Reset focus to center
  const resetFocus = useCallback(() => {
    lookAt(0, 0, true);
  }, [lookAt]);

  // Set expression
  const setExpression = useCallback(async (id: string | number) => {
    const model = modelRef.current;
    if (!model) return;

    try {
      await model.expression(id);
    } catch (err) {
      console.error('Failed to set expression:', err);
    }
  }, []);

  // Play motion
  const playMotion = useCallback(async (group: string, index: number, priority: number = 3) => {
    const model = modelRef.current;
    if (!model) return;

    try {
      await model.motion(group, index, priority);
    } catch (err) {
      console.error('Failed to play motion:', err);
    }
  }, []);

  // Tap at position
  const tap = useCallback((x: number, y: number) => {
    const model = modelRef.current;
    if (!model || !model.tap) return;

    // Convert to model's local coordinates if needed
    model.tap(x, y);
  }, []);

  // Speak with lipsync
  const speak = useCallback(async (audioUrl: string, options: SpeakOptions = {}) => {
    const model = modelRef.current;
    if (!model || !model.speak) return;

    try {
      await model.speak(audioUrl, {
        volume: options.volume ?? 1,
        expression: options.expression,
        resetExpression: options.resetExpression ?? true,
        crossOrigin: options.crossOrigin ?? 'anonymous',
        onFinish: options.onFinish,
        onError: options.onError,
      });
    } catch (err) {
      console.error('Failed to speak:', err);
      options.onError?.(err as Error);
    }
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    const model = modelRef.current;
    if (!model || !model.stopSpeaking) return;

    try {
      model.stopSpeaking();
    } catch (err) {
      console.error('Failed to stop speaking:', err);
    }
  }, []);

  return useMemo(() => ({
    lookAt,
    lookAtPosition,
    resetFocus,
    setExpression,
    playMotion,
    tap,
    speak,
    stopSpeaking,
  }), [lookAt, lookAtPosition, resetFocus, setExpression, playMotion, tap, speak, stopSpeaking]);
}