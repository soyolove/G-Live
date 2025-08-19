/**
 * Head motion controller for Live2D avatar
 * 使用动作库执行头部动作
 */

import { getMotionById, type MotionId } from './motionLibrary';

// Configuration for vtuber API
const VTUBER_API_BASE = process.env.VTUBER_API_URL || 'http://localhost:8011/api/control';

// Basic head position control
export async function setHeadPosition(x: number, y: number, instant: boolean = false): Promise<void> {
  try {
    const response = await fetch(`${VTUBER_API_BASE}/look`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y, instant })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to set head position:', error);
  }
}

// Execute a motion from the library
export async function executeMotion(motionId: MotionId, speedMultiplier: number = 1): Promise<void> {
  const motion = getMotionById(motionId);
  
  if (!motion) {
    console.error(`Motion not found: ${motionId}`);
    return;
  }

  // Apply default speed if specified
  const speed = speedMultiplier * (motion.defaultSpeed || 1);

  // Execute motion frames
  for (const frame of motion.frames) {
    await setHeadPosition(frame.x, frame.y, frame.instant);
    if (frame.duration > 0) {
      await new Promise(resolve => setTimeout(resolve, frame.duration / speed));
    }
  }

  // Handle loop type motions
  if (motion.type === 'loop') {
    // For loop motions, caller should handle the looping logic
    console.log(`Note: Motion ${motionId} is a loop type, consider implementing loop control`);
  }
}

// Legacy functions for backward compatibility
export async function nod(speed: number = 300): Promise<void> {
  const speedMultiplier = 300 / speed; // Convert to multiplier
  await executeMotion('nod', speedMultiplier);
}

export async function shake(speed: number = 300): Promise<void> {
  const speedMultiplier = 300 / speed; // Convert to multiplier
  await executeMotion('shake', speedMultiplier);
}

export async function resetHead(): Promise<void> {
  await executeMotion('reset');
}

// New motion functions using the library
export async function thinking(): Promise<void> {
  await executeMotion('thinking');
}

export async function excitedNod(): Promise<void> {
  await executeMotion('excited_nod');
}

export async function confused(): Promise<void> {
  await executeMotion('confused');
}

export async function lookAround(): Promise<void> {
  await executeMotion('look_around');
}

export async function sleepy(): Promise<void> {
  await executeMotion('sleepy');
}

export async function greeting(): Promise<void> {
  await executeMotion('greeting');
}

// Export composite action types for AI to use (backward compatibility)
export const COMPOSITE_ACTIONS = {
  NOD: 'nod',
  SHAKE: 'shake',
  THINKING: 'thinking',
  EXCITED_NOD: 'excited_nod',
  CONFUSED: 'confused',
  LOOK_AROUND: 'look_around',
  SLEEPY: 'sleepy',
  GREETING: 'greeting',
} as const;

export type CompositeActionType = typeof COMPOSITE_ACTIONS[keyof typeof COMPOSITE_ACTIONS];