import tmi from 'tmi.js';
import type { ChatMessage, ConnectionStatus } from './index.ts';

const MAX_MESSAGES = 150;

export class TwitchChatService {
  private client: any = null;
  private messages: ChatMessage[] = [];
  private status: ConnectionStatus = 'disconnected';
  private error: string | null = null;
  private channel: string = '';
  
  // SSE 连接管理
  private sseClients: Set<any> = new Set();

  async connect(channel: string): Promise<void> {
    if (this.client && this.status !== 'disconnected') {
      return;
    }

    if (!channel) {
      const errorMsg = "Channel name cannot be empty.";
      this.setError(errorMsg);
      this.setStatus('error');
      throw new Error(errorMsg);
    }

    this.channel = channel;
    this.setStatus('connecting');
    this.setError(null);
    this.messages = [];

    const twitchClient = new tmi.Client({
      options: { debug: false },
      connection: {
        secure: true,
        reconnect: true,
      },
      channels: [channel],
    });

    this.client = twitchClient;

    twitchClient.on('message', (ch: string, userstate: any, message: string, self: boolean) => {
      if (self) return;
      this.addMessage(ch, message, userstate);
    });

    twitchClient.on('connected', () => {
      this.setStatus('connected');
      console.log(`Successfully connected to #${channel}`);
    });

    twitchClient.on('disconnected', (reason: string) => {
      if (this.status !== 'disconnected') {
        this.setStatus('disconnected');
        this.setError(reason || "Disconnected from Twitch.");
        console.log(`Disconnected: ${reason}`);
      }
    });

    try {
      await twitchClient.connect();
    } catch (err: any) {
      console.error("Connection error:", err);
      this.setStatus('error');
      this.setError("Failed to connect. Check the channel name and try again.");
      this.client = null;
      throw err;
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.setStatus('disconnected');
      this.setError(null);
      this.messages = [];
      this.notifySSEClients({ type: 'disconnect' });
      console.log('Disconnected manually.');
    }
  }

  // SSE 客户端管理
  addSSEClient(res: any): void {
    this.sseClients.add(res);
    
    // 发送当前状态
    this.sendSSEMessage(res, {
      type: 'status',
      data: { status: this.status, channel: this.channel }
    });

    // 发送历史消息
    this.messages.forEach(message => {
      this.sendSSEMessage(res, { type: 'message', data: message });
    });
  }

  removeSSEClient(res: any): void {
    this.sseClients.delete(res);
  }

  private sendSSEMessage(res: any, data: any): void {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      this.removeSSEClient(res);
    }
  }

  private notifySSEClients(data: any): void {
    this.sseClients.forEach(client => {
      this.sendSSEMessage(client, data);
    });
  }

  private addMessage(user: string, message: string, userstate: any): void {
    const newMessage: ChatMessage = {
      id: userstate.id || `${Date.now()}-${Math.random()}`,
      user: userstate['display-name'] || user,
      message,
      color: userstate.color || '#FFFFFF',
      timestamp: new Date().toISOString(),
    };

    this.messages = [...this.messages, newMessage];
    if (this.messages.length > MAX_MESSAGES) {
      this.messages = this.messages.slice(this.messages.length - MAX_MESSAGES);
    }

    // 通知所有 SSE 客户端
    this.notifySSEClients({ type: 'message', data: newMessage });
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.notifySSEClients({ type: 'status', data: { status, channel: this.channel } });
  }

  private setError(error: string | null): void {
    this.error = error;
    if (error) {
      this.notifySSEClients({ type: 'error', data: { error } });
    }
  }

  // Getter 方法
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getConnectionStatus(): ConnectionStatus {
    return this.status;
  }

  getError(): string | null {
    return this.error;
  }

  getChannel(): string {
    return this.channel;
  }
}
