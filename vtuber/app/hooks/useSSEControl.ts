import { useEffect, useRef } from 'react';
import type { Live2DControlMethods } from './useLive2DControl';

interface SSECommand {
  type: 'lookAt' | 'lookAtPosition' | 'resetFocus' | 'expression' | 'motion' | 'tap' | 'subtitle' | 'connected';
  data: any;
}

interface SubtitleData {
  text: string;
  type: 'response' | 'reaction' | 'status';
  duration?: number;
  audio?: {
    url: string;
    duration: number;
    filename: string;
  } | null;
}

interface UseSSEControlProps {
  enabled: boolean;
  sseUrl?: string;
  controls: Live2DControlMethods;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
  onSubtitle?: (subtitle: SubtitleData & { timestamp: string }) => void;
}

export function useSSEControl({ 
  enabled, 
  sseUrl = '/api/sse', 
  controls,
  onConnectionChange,
  onError,
  onSubtitle
}: UseSSEControlProps) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(1000);
  const controlsRef = useRef(controls);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onErrorRef = useRef(onError);
  const onSubtitleRef = useRef(onSubtitle);
  
  // Update refs when props change
  useEffect(() => {
    controlsRef.current = controls;
    onConnectionChangeRef.current = onConnectionChange;
    onErrorRef.current = onError;
    onSubtitleRef.current = onSubtitle;
  }, [controls, onConnectionChange, onError, onSubtitle]);

  useEffect(() => {
    if (!enabled) {
      // Close connection if disabled
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        onConnectionChangeRef.current?.(false);
      }
      return;
    }

    const handleCommand = (command: SSECommand) => {
      const currentControls = controlsRef.current;
      
      switch (command.type) {
        case 'lookAt':
          currentControls.lookAt(command.data.x, command.data.y, command.data.instant);
          break;
        
        case 'lookAtPosition':
          currentControls.lookAtPosition(command.data.x, command.data.y, command.data.instant);
          break;
        
        case 'resetFocus':
          currentControls.resetFocus();
          break;
        
        case 'expression':
          currentControls.setExpression(command.data.id);
          break;
        
        case 'motion':
          currentControls.playMotion(
            command.data.group, 
            command.data.index, 
            command.data.priority
          );
          break;
        
        case 'tap':
          currentControls.tap(command.data.x, command.data.y);
          break;
        
        case 'subtitle':
          console.log('[SSE] Subtitle received:', command.data);
          onSubtitleRef.current?.({
            ...command.data,
            timestamp: new Date().toISOString()
          });
          break;
        
        case 'connected':
          console.log('[SSE] Server confirmed connection:', command);
          break;
        
        default:
          console.warn('Unknown command type:', command.type);
      }
    };

    const connect = () => {
      try {
        console.log(`[SSE] Attempting to connect to: ${sseUrl}`);
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[SSE] Connection established');
          onConnectionChangeRef.current?.(true);
          // Reset reconnect delay on successful connection
          reconnectDelayRef.current = 1000;
          // Clear any pending reconnect
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        eventSource.onmessage = (event) => {
          try {
            const command: SSECommand = JSON.parse(event.data);
            handleCommand(command);
          } catch (err) {
            console.error('[SSE] Failed to parse message:', err);
          }
        };

        eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);
          onConnectionChangeRef.current?.(false);
          
          // Don't call onError repeatedly during reconnection attempts
          if (!reconnectTimeoutRef.current) {
            onErrorRef.current?.(new Error('SSE connection failed'));
          }
          
          // Close the failed connection
          eventSource.close();
          eventSourceRef.current = null;
          
          // Reconnect with exponential backoff
          const maxDelay = 30000; // Max 30 seconds
          const currentDelay = Math.min(reconnectDelayRef.current, maxDelay);
          
          console.log(`[SSE] Reconnecting in ${currentDelay / 1000} seconds...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (enabled) { // Only reconnect if still enabled
              console.log('[SSE] Attempting to reconnect...');
              // Increase delay for next attempt
              reconnectDelayRef.current = Math.min(currentDelay * 2, maxDelay);
              connect();
            }
          }, currentDelay);
        };

        // Handle specific event types
        eventSource.addEventListener('control', (event: any) => {
          try {
            const command: SSECommand = JSON.parse(event.data);
            handleCommand(command);
          } catch (err) {
            console.error('[SSE] Failed to parse control event:', err);
          }
        });

      } catch (err) {
        console.error('[SSE] Failed to create EventSource:', err);
        onErrorRef.current?.(err as Error);
      }
    };
    
    // Add a small delay to ensure the component is mounted
    const connectTimer = setTimeout(() => {
      if (enabled) {
        connect();
      }
    }, 100);

    return () => {
      clearTimeout(connectTimer);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        onConnectionChangeRef.current?.(false);
      }
    };
  }, [enabled, sseUrl]); // Using refs for callbacks to prevent re-runs

  return {
    connected: !!eventSourceRef.current,
  };
}