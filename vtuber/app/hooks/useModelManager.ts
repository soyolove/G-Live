import { useState, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from '../lib/Live2DModel';
import type { Live2DModelInstance, ExtendedFileList } from '../lib/types';

interface UseModelManagerProps {
  app: PIXI.Application | null;
  mouseTracking: boolean;
  onModelLoad?: (model: Live2DModelInstance) => void;
  onError?: (error: Error) => void;
}

export function useModelManager({ app, mouseTracking, onModelLoad, onError }: UseModelManagerProps) {
  const [currentModel, setCurrentModel] = useState<Live2DModelInstance | null>(null);
  const [modelScale, setModelScale] = useState(0.25);
  const currentModelRef = useRef<Live2DModelInstance | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const setupModelInteraction = useCallback((model: Live2DModelInstance) => {
    // Enable interaction
    model.interactive = true;
    if ('buttonMode' in model) {
      model.buttonMode = true;
    }

    // Handle drag start
    model.on('pointerdown', (event: any) => {
      const position = event.data.getLocalPosition(model.parent);
      dragOffsetRef.current = {
        x: position.x - model.x,
        y: position.y - model.y,
      };
      isDraggingRef.current = true;
      model.alpha = 0.8;
      
      // Temporarily disable autoInteract during drag
      if (model.autoInteract) {
        model.autoInteract = false;
        (model as any)._tempAutoInteract = true;
      }
    });

    // Handle drag end
    const handleDragEnd = () => {
      isDraggingRef.current = false;
      model.alpha = 1;
      
      // Re-enable autoInteract if it was temporarily disabled
      if ((model as any)._tempAutoInteract) {
        model.autoInteract = true;
        delete (model as any)._tempAutoInteract;
      }
    };

    model.on('pointerup', handleDragEnd);
    model.on('pointerupoutside', handleDragEnd);

    // Handle drag move
    model.on('pointermove', (event: any) => {
      if (isDraggingRef.current) {
        const position = event.data.getLocalPosition(model.parent);
        model.x = position.x - dragOffsetRef.current.x;
        model.y = position.y - dragOffsetRef.current.y;
      }
    });
  }, []);

  const cleanupCurrentModel = useCallback(() => {
    if (currentModel && app) {
      app.stage.removeChild(currentModel as unknown as PIXI.DisplayObject);
      currentModel.destroy();
      currentModelRef.current = null;
    }
  }, [currentModel, app]);

  const loadModel = useCallback(async (source: string | File[] | ExtendedFileList) => {
    if (!app) return;

    try {
      cleanupCurrentModel();

      const model = await Live2DModel.from(source, {
        autoHitTest: true,  // Enable hit test for tap interactions
        autoFocus: mouseTracking,  // Enable mouse tracking
      });

      model.scale.set(0.25);
      model.x = app.screen.width / 2;
      model.y = app.screen.height / 2;

      setupModelInteraction(model);

      app.stage.addChild(model as unknown as PIXI.DisplayObject);
      setCurrentModel(model);
      currentModelRef.current = model;
      setModelScale(0.25);
      
      onModelLoad?.(model);
    } catch (err) {
      const error = err as Error;
      onError?.(error);
      throw error;
    }
  }, [app, mouseTracking, setupModelInteraction, cleanupCurrentModel, onModelLoad, onError]);

  const updateModelScale = useCallback((scale: number) => {
    if (currentModel) {
      currentModel.scale.set(scale);
      setModelScale(scale);
    }
  }, [currentModel]);

  return {
    currentModel,
    modelScale,
    currentModelRef,
    loadModel,
    updateModelScale,
    setModelScale,
  };
}