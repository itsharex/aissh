
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, LogEntry } from '../types/index';
import { Button } from '../common/Button';
import { chatWithAI, analyzeLogs } from '../services/geminiService';

interface AIChatProps {
  currentLogs: LogEntry[];
  onAutoCommand: (cmd: string) => void;
}

export const AIChat: React.FC<AIChatProps> = ({ currentLogs, onAutoCommand }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await chatWithAI(inputValue, messages);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response || '抱歉，我遇到了点问题。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAnalyzeLogs = async () => {
    if (currentLogs.length === 0) return;
    
    setIsTyping(true);
    const logText = currentLogs.map(l => `${l.timestamp}: ${l.content}`).join('\n');
    
    try {
      const analysis = await analyzeLogs(logText);
      const aiMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**日志分析报告：**\n\n${analysis}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
       console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const extractCommand = (content: string) => {
    const match = content.match(/`([^`]+)`/);
    if (match) {
        onAutoCommand(match[1]);
    }
  }

  return (
    <div className="flex flex-col h-full bg-base-200 w-96 border-l border-base-100">
      <div className="p-4 border-b border-base-100 flex flex-col gap-2">
        <h2 className="font-bold flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
           AI 运维助手
        </h2>
        <div className="flex gap-2">
            <Button size="xs" variant="accent" onClick={handleAnalyzeLogs} disabled={currentLogs.length === 0}>
                智能分析日志
            </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {messages.length === 0 && (
          <div className="text-center opacity-40 mt-10 space-y-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18L12 6M12 6L6 12M12 6L18 12" />
            </svg>
            <p>你可以问我关于服务器管理、脚本编写或系统排障的问题。</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
            <div className={`chat-bubble whitespace-pre-wrap ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-neutral'}`}>
              {msg.content}
              {msg.role === 'assistant' && msg.content.includes('`') && (
                <div className="mt-2 border-t border-base-content/10 pt-2">
                   <Button size="xs" variant="ghost" className="text-accent" onClick={() => extractCommand(msg.content)}>
                     自动填充检测到的命令
                   </Button>
                </div>
              )}
            </div>
            <div className="chat-footer opacity-50 text-[10px]">
              {msg.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat chat-start">
            <div className="chat-bubble chat-bubble-neutral">
              <span className="loading loading-dots loading-xs"></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-base-300">
        <div className="flex gap-2">
          <textarea 
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="输入消息..."
            className="textarea textarea-bordered flex-1 resize-none"
          />
          <Button variant="primary" onClick={handleSend} className="h-full px-4">
             发送
          </Button>
        </div>
      </div>
    </div>
  );
};
