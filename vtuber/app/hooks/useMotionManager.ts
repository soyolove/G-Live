import { useState, useEffect, useCallback } from 'react';
import type { Live2DModelInstance } from '../lib/types';

export function useMotionManager(currentModel: Live2DModelInstance | null) {
  const [currentMotion, setCurrentMotion] = useState<{
    group: string;
    index: number;
  } | null>(null);
  const [motionProgress, setMotionProgress] = useState(0);

  // Update motion progress
  useEffect(() => {
    if (!currentModel || !currentMotion) {
      setMotionProgress(0);
      return;
    }

    const intervalId = setInterval(() => {
      const startTime = currentModel.currentMotionStartTime;
      const duration = currentModel.currentMotionDuration;

      if (duration > 0 && startTime > 0) {
        // Use elapsedTime from the model instead of performance.now()
        const elapsed = currentModel.elapsedTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setMotionProgress(progress);

        if (progress >= 1) {
          setCurrentMotion(null);
          setMotionProgress(0);
        }
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [currentModel, currentMotion]);

  const playMotion = useCallback(async (group: string, index: number) => {
    if (!currentModel) return;

    try {
      // Force priority to interrupt current motion
      await currentModel.motion(group, index, 3); // 3 = FORCE priority

      // Manually set motion start time and get duration
      currentModel.currentMotionStartTime =
        currentModel.elapsedTime || performance.now();

      // Get motion duration
      const motion =
        currentModel.internalModel.motionManager.motionGroups[group]?.[index];
      if (motion) {
        if ('_loopDurationSeconds' in motion && motion._loopDurationSeconds) {
          currentModel.currentMotionDuration =
            motion._loopDurationSeconds * 1000;
        } else if (
          'getDurationMSec' in motion &&
          typeof motion.getDurationMSec === 'function'
        ) {
          currentModel.currentMotionDuration = motion.getDurationMSec();
        } else {
          // Default duration if not found
          currentModel.currentMotionDuration = 2000;
        }
      }

      setCurrentMotion({ group, index });
      setMotionProgress(0);
    } catch (err) {
      console.error('Failed to play motion:', err);
    }
  }, [currentModel]);

  return {
    currentMotion,
    motionProgress,
    playMotion,
  };
}