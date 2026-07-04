import { ConversationMessage, TerminalLog } from '../types';

export class ConversationMemory {
  private messages: ConversationMessage[] = [];
  private logs: TerminalLog[] = [];

  public addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    intent?: string,
    actionExecuted?: string,
    pluginUsed?: string,
    success?: boolean
  ): ConversationMessage {
    const newMessage: ConversationMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role,
      content,
      timestamp: new Date().toLocaleTimeString(),
      intent,
      actionExecuted,
      pluginUsed,
      success,
    };
    
    this.messages.push(newMessage);
    
    // Limit memory history size
    if (this.messages.length > 50) {
      this.messages.shift();
    }
    
    return newMessage;
  }

  public addLog(source: TerminalLog['source'], message: string): TerminalLog {
    const newLog: TerminalLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      source,
      message,
    };
    
    this.logs.push(newLog);
    
    // Limit terminal logs size
    if (this.logs.length > 200) {
      this.logs.shift();
    }
    
    return newLog;
  }

  public getMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  public getLogs(): TerminalLog[] {
    return [...this.logs];
  }

  public clear(): void {
    this.messages = [];
    this.logs = [];
  }
}
