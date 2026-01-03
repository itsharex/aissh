import { ChatMessage, AgentConfig } from '../types';

export interface AIService {
  predictCommandRisk(command: string, signal?: AbortSignal): Promise<{ explanation: string, riskLevel: string, warning: string } | null>;
  chatWithAIStream(
    message: string,
    history: ChatMessage[],
    onChunk: (chunk: string) => void,
    shouldStop?: () => boolean
  ): Promise<void>;
  chatWithAI(prompt: string, history: ChatMessage[]): Promise<string>;
}

export class AIServiceFactory {
  private static services: Record<string, AIService> = {};

  static register(name: string, service: AIService) {
    this.services[name] = service;
  }

  static getService(name: string): AIService {
    const service = this.services[name];
    if (!service) {
      throw new Error(`AI Service ${name} not found`);
    }
    return service;
  }
}
