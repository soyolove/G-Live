export interface ChatMessage {
  id: string;
  user: string;
  message: string;
  color?: string;
  timestamp?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';