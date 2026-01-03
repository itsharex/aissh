import React from 'react';
import { Radio } from 'lucide-react';
import { useSSHStore } from '../store/useSSHStore';
import { Terminal } from './Terminal';

interface TerminalAreaProps {
  commandToInsert: string | null;
  onAnalyzeLog: (logLine: string) => void;
}

export const TerminalArea: React.FC<TerminalAreaProps> = ({ commandToInsert, onAnalyzeLog }) => {
  const { activeSessionId, openSessions, logs, setLogs, connectionStatus } = useSSHStore();

  return (
    <div className="flex-1 relative bg-black overflow-hidden flex flex-col">
      {openSessions.map(sessionId => (
        <div 
          key={sessionId} 
          className={`flex-1 flex flex-col w-full h-full ${activeSessionId === sessionId ? 'block' : 'hidden'}`}
        >
           <Terminal 
             logs={logs.filter(l => l.serverId === sessionId || l.serverId === 'system')} 
             serverId={sessionId}
             onClear={() => setLogs(logs.filter(x => x.serverId !== sessionId))} 
             onAnalyzeError={onAnalyzeLog}
             onSelectionAI={(text) => {
               // 这里确保只传递文本，不触发自动分析
               onAnalyzeLog(text);
             }}
             status={connectionStatus[sessionId] || 'disconnected'} 
             commandToInsert={activeSessionId === sessionId ? commandToInsert : null}
           />
        </div>
      ))}

      {!activeSessionId && (
        <div className="h-full flex flex-col items-center justify-center select-none bg-sci-obsidian/20 relative overflow-hidden absolute inset-0">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.05)_0%,transparent_70%)] animate-pulse"></div>
           
           <div className="relative z-10 flex flex-col items-center">
             <div className="w-24 h-24 mb-8 flex items-center justify-center relative">
               <div className="absolute inset-0 border-2 border-sci-cyan/20 rounded-full animate-ping"></div>
               <div className="absolute inset-2 border border-sci-cyan/40 rounded-full animate-reverse-spin"></div>
               <Radio size={48} className="text-sci-cyan drop-shadow-[0_0_15px_rgba(0,243,255,0.5)]"/>
             </div>
             
             <div className="text-center space-y-2">
               <h2 className="text-lg font-sci font-bold text-sci-cyan uppercase tracking-[0.5em] animate-pulse">Awaiting Secure Link</h2>
               <p className="text-[10px] text-sci-cyan/40 uppercase tracking-[0.3em] font-bold">Select a neural node to initialize uplink</p>
             </div>
           </div>

           <div className="absolute bottom-10 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-sci-cyan/20 to-transparent"></div>
        </div>
      )}
    </div>
  );
};
