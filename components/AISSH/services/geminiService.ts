import OpenAI from 'openai';
import { ChatMessage, AgentConfig } from '../types';
import { AIService, AIServiceFactory } from './aiServiceFactory';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL,
  dangerouslyAllowBrowser: true
});

const getModel = () => import.meta.env.VITE_OPENAI_MODEL || 'qwen-max';

const isRiskyCommand = (cmd: string): boolean => {
  const riskyKeywords = [
    'rm ', 'kill ', 'reboot', 'shutdown', 'mkfs', 'dd ', 
    'mv ', 'chmod', 'chown', 'systemctl stop', 'systemctl disable',
    'halt', 'poweroff', '> /', 'format'
  ];
  return riskyKeywords.some(keyword => cmd.toLowerCase().includes(keyword));
};

export class GeminiAIService implements AIService {
  async predictCommandRisk(command: string, signal?: AbortSignal) {
    if (!command.trim() || command.length < 2) return null;
    try {
      const response = await openai.chat.completions.create({
        model: getModel(),
        messages: [
          {
            role: 'system',
            content: '你是一个 Linux 安全专家。请分析以下命令并返回 JSON。要求：1. explanation: 简短的中文功能说明。2. riskLevel: "low", "medium", 或 "high"。3. warning: 如果风险等级中或高，说明原因，否则为空。'
          },
          {
            role: 'user',
            content: `命令: ${command}`
          }
        ],
        response_format: { type: "json_object" }
      }, { signal });
      
      if (signal?.aborted) return null;
      return JSON.parse(response.choices[0]?.message?.content || "{}");
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return null;
      return { explanation: "无法获取详细解析", riskLevel: "medium", warning: "解析失败" };
    }
  }

  async chatWithAIStream(
    message: string, 
    history: ChatMessage[], 
    onChunk: (chunk: string) => void,
    shouldStop?: () => boolean
  ) {
    try {
      const MAX_HISTORY_MESSAGES = 20;
      const recentHistory = history.length > MAX_HISTORY_MESSAGES 
        ? history.slice(-MAX_HISTORY_MESSAGES) 
        : history;

      const mappedHistory: OpenAI.Chat.ChatCompletionMessageParam[] = recentHistory.map((m) => {
        const role: 'user' | 'assistant' | 'system' =
          m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user';
        const content = m.content.length > 5000 ? m.content.slice(0, 5000) + "..." : m.content;
        return { role, content };
      });

      const stream = await openai.chat.completions.create({
        model: getModel(),
        messages: [
          {
            role: 'system',
            content: `你是一个专家级 Linux 运维 AI。请使用 Markdown 格式回答。
            
如果你正在分析日志，请遵循以下格式以获得更好的可视化效果：
1. 如果要展示日志原始内容，请使用 \`\`\`log 代码块。
2. 如果要提供结构化的分析概览，请在回答末尾包含一个 \`\`\`json 代码块，其结构如下：
{
  "log_analysis": {
    "summary": { "Errors": 0, "Warnings": 0, "Info": 0 },
    "details": ["异常点1", "异常点2"],
    "recommendations": ["建议1", "建议2"]
  }
}
保持回答简洁专业。`
          },
          ...mappedHistory,
          { role: 'user', content: message }
        ],
        stream: true
      });

      for await (const chunk of stream) {
        if (shouldStop && shouldStop()) break;
        const content = chunk.choices[0]?.delta?.content;
        if (content) onChunk(content);
      }
    } catch (error) {
      onChunk("\n\n*连接 AI 出错。*");
    }
  }

  async chatWithAI(prompt: string, history: ChatMessage[]): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: getModel(),
        messages: [
          { role: 'system', content: '你是一个专家级 Linux 运维 AI。' },
          ...history.map(m => ({ role: m.role as any, content: m.content })),
          { role: 'user', content: prompt }
        ]
      });
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      return 'Error connecting to AI service';
    }
  }
}

// Register Gemini service
AIServiceFactory.register('gemini', new GeminiAIService());

// Legacy exports
const geminiInstance = new GeminiAIService();
export const predictCommandRisk = geminiInstance.predictCommandRisk.bind(geminiInstance);
export const chatWithAIStream = geminiInstance.chatWithAIStream.bind(geminiInstance);
export const chatWithAI = geminiInstance.chatWithAI.bind(geminiInstance);

export const runAutonomousTask = async (
  goal: string,
  config: AgentConfig,
  onStep: (step: { thought: string, command?: string, result?: string, isDone: boolean, summary?: string, requiresConfirmation?: boolean }) => Promise<void>,
  requestConfirmation: (command: string) => Promise<boolean>,
  shouldStop: () => boolean
) => {
  const modelName = getModel();
  
  let systemPrompt = `目标: ${goal}
        
  你现在是自主运维代理。请根据目标执行命令。
  必须严格遵循以下 JSON 格式回答，不要包含任何额外文字：
  {
    "thought": "描述你当前的思考过程和计划步骤",
    "command": "要执行的 Linux 命令，如果已完成则为空",
    "isDone": false,
    "summary": "如果任务完成，请简单标记 'DONE'，详细报告将在下一步生成"
  }

注意：
1. 每一轮你只能执行一条命令。
2. 你会看到命令的实际输出，请根据输出判断成功与否。
3. 如果用户拒绝了某个危险命令，请尝试寻找更安全的替代方案。
4. 只有在确认目标达成后，才将 isDone 设为 true。
5. 当你决定任务完成时，summary 字段只需填写简单的 'DONE'，不需要在这里写详细报告。`;

  if (config.safeMode) {
    systemPrompt += `\n5. 安全模式开启：如果你计划执行 rm, kill, reboot 等危险操作，系统会要求用户手动确认。`;
  }

  if (config.customPrompt) {
    systemPrompt += `\n额外准则：${config.customPrompt}`;
  }

  let history: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt
    }
  ];

  let attempts = 0;
  const maxAttempts = config.maxAttempts || 15;

  while (attempts < maxAttempts) {
    if (shouldStop()) {
      await onStep({ thought: "任务已被用户手动停止。", isDone: true, summary: "用户中止了操作。" });
      return;
    }

    const currentAttemptInfo = `当前是第 ${attempts + 1} 次尝试（最多 ${maxAttempts} 次）。`;
    
    try {
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          ...history,
          { role: 'user', content: currentAttemptInfo }
        ],
        response_format: { type: "json_object" },
        temperature: config.temperature
      });

      const plan = JSON.parse(response.choices[0]?.message?.content || "{}");

      if (plan.isDone) {
        await onStep({ thought: plan.thought, isDone: true, summary: "" });
        
        const summaryPrompt = "任务已完成。请生成一份详细的 Markdown 格式总结报告。要求：\n1. 包含执行结果的详细说明。\n2. 如果涉及数据对比或列表展示，必须使用 Markdown 表格。\n3. 结构清晰，使用标题和代码块。\n4. 语气专业。";
        
        history.push({ role: 'assistant', content: JSON.stringify(plan) });
        
        let accumulatedSummary = "";
        try {
          const stream = await openai.chat.completions.create({
            model: modelName,
            messages: [
              ...history,
              { role: 'user', content: summaryPrompt }
            ],
            stream: true
          });

          for await (const chunk of stream) {
            if (shouldStop()) break;
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              accumulatedSummary += content;
              await onStep({ thought: plan.thought, isDone: true, summary: accumulatedSummary });
            }
          }
        } catch (e) {
          await onStep({ thought: plan.thought, isDone: true, summary: accumulatedSummary || "生成总结报告时发生错误。" });
        }
        
        return;
      }

      let commandResult = "";
      if (plan.command) {
        if (config.safeMode && isRiskyCommand(plan.command)) {
          await onStep({ thought: plan.thought, command: plan.command, isDone: false, requiresConfirmation: true });
          
          const confirmed = await requestConfirmation(plan.command);
          if (!confirmed) {
            commandResult = "用户拒绝了此危险命令的执行。请考虑其他不那么危险的方案，或者解释为什么必须执行此命令。";
          } else {
            commandResult = await (onStep as any).execute(plan.command);
          }
        } else {
          await onStep({ thought: plan.thought, command: plan.command, isDone: false });
          commandResult = await (onStep as any).execute(plan.command);
        }
      }

      const MAX_RESULT_LENGTH = 10000;
      if (commandResult && commandResult.length > MAX_RESULT_LENGTH) {
        commandResult = commandResult.slice(0, MAX_RESULT_LENGTH) + "\n\n(输出内容过长，已截断...)";
      }

      history.push({
        role: 'assistant',
        content: JSON.stringify(plan)
      });
      history.push({
        role: 'user',
        content: `命令执行结果:\n${commandResult || "无输出内容"}`
      });

      if (history.length > 30) {
        history = [history[0], ...history.slice(-20)];
      }

      attempts++;
    } catch (e) {
      await onStep({ thought: "执行过程中遇到解析错误或网络异常。", isDone: true, summary: "Agent 异常退出。" });
      return;
    }
  }

  await onStep({ thought: "达到最大尝试次数，任务未能自动完成。", isDone: true, summary: "超时退出。" });
};

export const analyzeLogs = async (log: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: '你是一个 Linux 日志分析专家。请分析以下日志并给出简洁的分析结果。' },
        { role: 'user', content: log }
      ]
    });
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    return 'Error analyzing logs';
  }
};
