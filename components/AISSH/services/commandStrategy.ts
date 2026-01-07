import { sshManager } from './sshService';
import { BatchResult } from '../types';

export interface ExecutionStrategy {
  execute(command: string, context: { 
    activeSessionId: string | null, 
    openSessions: string[], 
    onBatchResults?: (results: BatchResult[]) => void 
  }): Promise<void>;
}

export class SingleExecutionStrategy implements ExecutionStrategy {
  async execute(command: string, context: { activeSessionId: string | null }) {
    if (context.activeSessionId) {
      sshManager.sendCommand(command, context.activeSessionId);
    }
  }
}

export class BatchExecutionStrategy implements ExecutionStrategy {
  async execute(command: string, context: { openSessions: string[] }) {
    // Filter out file manager sessions
    const terminalSessions = context.openSessions.filter(id => !id.endsWith('#files'));
    terminalSessions.forEach(id => {
      sshManager.sendCommand(command, id);
    });
  }
}

export class BatchCompareStrategy implements ExecutionStrategy {
  async execute(command: string, context: { 
    openSessions: string[], 
    onBatchResults?: (results: BatchResult[]) => void 
  }) {
    // Filter out file manager sessions
    const terminalSessions = context.openSessions.filter(id => !id.endsWith('#files'));
    
    const promises = terminalSessions.map(async (id) => {
      try {
        const output = await sshManager.executeCommand(command, id);
        return {
          serverId: id,
          serverName: id, // We'll need to resolve this name in the component or store
          command: command,
          output: output,
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        return {
          serverId: id,
          serverName: id,
          command: command,
          output: `Error: ${err}`,
          timestamp: new Date().toISOString()
        };
      }
    });

    const results = await Promise.all(promises);
    if (context.onBatchResults) {
      context.onBatchResults(results);
    }
  }
}

export class CommandExecutor {
  private strategy: ExecutionStrategy;

  constructor(strategy: ExecutionStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: ExecutionStrategy) {
    this.strategy = strategy;
  }

  async execute(command: string, context: { 
    activeSessionId: string | null, 
    openSessions: string[],
    onBatchResults?: (results: BatchResult[]) => void
  }) {
    await this.strategy.execute(command, context);
  }
}
