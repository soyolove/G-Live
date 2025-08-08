/**
 * Head motion definitions for Live2D avatar
 */

// Configuration for vtuber API
const VTUBER_API_BASE = process.env.VTUBER_API_URL || 'http://localhost:8011/api/control';

// Meta actions - basic head position control
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

export async function setHeadX(x: number, instant: boolean = false): Promise<void> {
  // Keep current Y position (0 for neutral)
  await setHeadPosition(x, 0, instant);
}

export async function setHeadY(y: number, instant: boolean = false): Promise<void> {
  // Keep current X position (0 for neutral)
  await setHeadPosition(0, y, instant);
}

// Composite actions - meaningful gestures
export async function nod(speed: number = 300): Promise<void> {
  // Nodding motion: up and down
  const positions = [
    { x: 0, y: 0 },     // center
    { x: 0, y: 0.5 },   // up
    { x: 0, y: 0 },     // center
    { x: 0, y: 0.5 },   // up
    { x: 0, y: 0 },     // center
  ];
  
  for (const pos of positions) {
    await setHeadPosition(pos.x, pos.y);
    await new Promise(resolve => setTimeout(resolve, speed));
  }
}

export async function shake(speed: number = 300): Promise<void> {
  // Shaking motion: left and right
  const positions = [
    { x: 0, y: 0 },     // center
    { x: -0.5, y: 0 },  // left
    { x: 0, y: 0 },     // center
    { x: 0.5, y: 0 },   // right
    { x: 0, y: 0 },     // center
  ];
  
  for (const pos of positions) {
    await setHeadPosition(pos.x, pos.y);
    await new Promise(resolve => setTimeout(resolve, speed));
  }
}

// Reset to neutral position
export async function resetHead(): Promise<void> {
  await setHeadPosition(0, 0, true);
}

// Export composite action types for AI to use
export const COMPOSITE_ACTIONS = {
  NOD: 'nod',
  SHAKE: 'shake',
} as const;

export type CompositeActionType = typeof COMPOSITE_ACTIONS[keyof typeof COMPOSITE_ACTIONS];