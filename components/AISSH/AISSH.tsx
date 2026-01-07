import React, { useState, useEffect, useRef } from 'react';
import { ServerTree, AddServerModal, PasswordModal, AIChatPanel, sshManager } from './index';
import type { AIChatPanelRef } from './index';
import { useSSHStore } from './store/useSSHStore';
import { useFileStore } from './store/useFileStore';
import { SessionTabs } from './components/SessionTabs';
import { TerminalArea } from './components/TerminalArea';
import { CommandInput } from './components/CommandInput';
import { MonacoEditor } from './components/FileEditor/MonacoEditor';
import { FileBrowser } from './components/FileEditor/FileBrowser';
import { FileOperations } from './components/FileEditor/FileOperations';
import { FileTabs } from './components/FileEditor/FileTabs';
import { Terminal, FileCode } from 'lucide-react';

const AISSH: React.FC = () => {
  const { 
    servers, folders, activeSessionId, openSessions, logs, failureCounts,
    setActiveSessionId, setOpenSessions, 
    addLog, updateConnectionStatus, addServer, updateServer, deleteServer,
    addFolder, updateFolder, deleteFolder, resetFailureCount, incrementFailureCount
  } = useSSHStore();

  const {
    fileSessions, activeFileSessionId, openFile, closeFile, updateFileContent, saveFile, setActiveFileSessionId, backupFile
  } = useFileStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState<{ parentId: string | null, editData?: any } | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<{ serverId: string, serverName: string } | null>(null);
  const [commandToInsert, setCommandToInsert] = useState<string | null>(null);
  // Remove activeTab state as we derive it from activeSessionId
  // const [activeTab, setActiveTab] = useState<'terminal' | 'files'>('terminal');
  const aiChatPanelRef = useRef<AIChatPanelRef>(null);

  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(450);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  // Helper to check session type
  const isFileSession = activeSessionId?.endsWith('#files') ?? false;
  const realActiveSessionId = activeSessionId?.split('#')[0] ?? null;

  useEffect(() => {
    const unsubLog = sshManager.onLog((log) => {
      addLog(log);
    });

    const unsubStatus = sshManager.onStatus((status) => {
      let mappedStatus: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
      if (status.status === 'connected') {
        mappedStatus = 'connected';
        resetFailureCount(status.serverId); // 连接成功，重置失败计数
      }
      else if (status.status === 'connecting') mappedStatus = 'connecting';
      else if (status.status === 'error') {
        mappedStatus = 'error';
        incrementFailureCount(status.serverId); // 增加失败计数
        // 如果是超时错误，给一些特别的提示
        if (status.message?.includes('timed out')) {
          addLog({
            timestamp: new Date().toLocaleTimeString(),
            type: 'error',
            content: `连接服务器 ${status.serverId} 超时 (5s)，请检查网络连接或服务器状态。`,
            serverId: status.serverId
          });
        }
      }
      else if (status.status === 'disconnected') {
        mappedStatus = 'disconnected';
      }
      
      updateConnectionStatus(status.serverId, mappedStatus);
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft.current) setLeftWidth(Math.max(150, Math.min(e.clientX, 500)));
      if (isResizingRight.current) setRightWidth(Math.max(300, Math.min(window.innerWidth - e.clientX, 800)));
    };

    const handleMouseUp = () => {
      isResizingLeft.current = isResizingRight.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      unsubLog();
      unsubStatus();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [addLog, updateConnectionStatus]);

  const handleSelectServer = (id: string) => {
    // Check if this is a file session request or regular server request
    const isFileReq = id.endsWith('#files');
    const realId = id.split('#')[0];
    
    // Ensure the regular session is also tracked if needed, 
    // but for file session we just need to ensure connection exists.
    // However, sshManager manages connections by realId.
    
    if (!openSessions.includes(id)) setOpenSessions(prev => [...prev, id]);
    setActiveSessionId(id);
    
    // 每次从菜单点击（ServerTree）时，通知 AI 面板创建新会话
    if (aiChatPanelRef.current) {
      aiChatPanelRef.current.createNewSession(realId);
    }

    const server = servers.find(s => s.id === realId);
    if (server) {
      if (server.status === 'connected') return; // Already connected
      
      // 检查失败次数
      const failureCount = failureCounts[realId] || 0;
      if (failureCount >= 2 && server.status !== 'error') { // 如果不是刚报错的状态，且已经失败两次了
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          content: `连接失败次数过多 (${failureCount})，已停止自动连接。请检查配置或稍后再试。`,
          serverId: realId
        });
         // 直接在终端也输出一下
         sshManager.writeRaw(`\r\n\x1b[31m[System] Connection aborted after ${failureCount} failures. Please check your credentials/network.\x1b[0m\r\n`, realId);
         return;
       }
      
      if (server.password) {
         resetFailureCount(realId);
         updateConnectionStatus(realId, 'connecting');
         sshManager.connect(server.ip, server.username, server.password, realId);
      } else {
         setPasswordPrompt({ serverId: realId, serverName: server.name });
      }
    }
  };

  const handlePasswordConfirm = (password: string, remember: boolean) => {
    if (!passwordPrompt) return;
    const { serverId } = passwordPrompt;
    
    // Handle file session ID: extract real ID to find server details
    const realId = serverId.split('#')[0];
    const server = servers.find(s => s.id === realId);

    if (server) {
      if (remember && serverId === realId) { // Only update password for the main server record
        updateServer(serverId, { password });
      }
      resetFailureCount(serverId);
      updateConnectionStatus(serverId, 'connecting');
      // Connect using the specific session ID (could be serverId or serverId#files)
      sshManager.connect(server.ip, server.username, password, serverId);
    }
    setPasswordPrompt(null);
  };

  const handleAnalyzeLogFromTerminal = (logLine: string) => {
    if (aiChatPanelRef.current) {
      aiChatPanelRef.current.triggerExternalPrompt(logLine);
    }
  };

  const handleInsertCommand = (command: string) => {
    setCommandToInsert(command);
    setTimeout(() => setCommandToInsert(null), 100);
  };

  const handleFileOpen = (filePath: string) => {
    if (activeSessionId) {
      // For file operations, we use the activeSessionId directly as it maps to the specific connection
      // If it's a file session (e.g. "id#files"), the connection is registered under that ID.
      // If it's a terminal session (e.g. "id"), the connection is registered under that ID.
      // But openFile expects the serverId to match the connection.
      // Since we now have independent connections for files, we should use activeSessionId.
      openFile(activeSessionId, filePath);
    }
  };

  const handleFileSave = async (sessionId: string) => {
    await saveFile(sessionId);
  };

  const handleFileClose = (sessionId: string) => {
    closeFile(sessionId);
  };

  const handleFileDownload = (sessionId: string) => {
    const session = fileSessions[sessionId];
    if (!session) return;
    const blob = new Blob([session.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = session.filePath.split('/').pop() || 'download';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileBackup = async (sessionId: string) => {
    const session = fileSessions[sessionId];
    if (!session) return;
    const success = await backupFile(session.serverId, session.filePath);
    if (success) {
      alert('备份成功');
    } else {
      alert('备份失败');
    }
  };

  const handleFileChange = (sessionId: string, content: string) => {
    updateFileContent(sessionId, content);
  };

  return (
    <div className="flex h-screen bg-sci-base text-sci-text font-sci overflow-hidden bg-grid-pattern relative">
      {/* 全局扫描线效果 */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,118,0.01))] bg-[length:100%_4px,3px_100%] z-[100] opacity-30"></div>
      
      {/* HUD 装饰性边框 */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-sci-cyan/20 pointer-events-none z-50"></div>
      <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-sci-cyan/20 pointer-events-none z-50"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-sci-cyan/20 pointer-events-none z-50"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-sci-cyan/20 pointer-events-none z-50"></div>

      {/* Sidebar Area */}
      <div style={{ width: leftWidth }} className="flex-shrink-0 select-none bg-sci-obsidian/40 backdrop-blur-md border-r border-white/5 relative z-10">
        <ServerTree 
          width={leftWidth}
          servers={servers} 
          folders={folders} 
          activeServerId={activeSessionId} 
          onSelectServer={handleSelectServer} 
          onAddServer={(p) => setIsAddModalOpen({ parentId: p })} 
          onEditServer={(server) => setIsAddModalOpen({ parentId: server.parentId, editData: server })} 
          onDeleteServer={deleteServer} 
          onAddFolder={(p) => addFolder('新建文件夹', p)} 
          onEditFolder={updateFolder} 
          onDeleteFolder={deleteFolder} 
          onMove={(t, id, p) => {
            if(t === 'server') updateServer(id, { parentId: p });
            else updateFolder(id, { parentId: p });
          }}
          onOpenFileManager={(serverId) => {
             // 1. Create a special session ID for file manager
             const fileSessionId = `${serverId}#files`;
             const server = servers.find(s => s.id === serverId);

             // 2. Add to openSessions if not present
             if (!openSessions.includes(fileSessionId)) {
                setOpenSessions(prev => [...prev, fileSessionId]);
             }
             // 3. Set as active
             setActiveSessionId(fileSessionId);

             // 4. Check connection status and connect if needed
             // Use connectionStatus of the file session ID, not the original server ID
             const status = useSSHStore.getState().connectionStatus[fileSessionId];
             if (status !== 'connected' && status !== 'connecting' && server) {
                if (server.password) {
                   resetFailureCount(fileSessionId);
                   updateConnectionStatus(fileSessionId, 'connecting');
                   sshManager.connect(server.ip, server.username, server.password, fileSessionId);
                } else {
                   // Prompt for password, passing the file session ID
                   setPasswordPrompt({ serverId: fileSessionId, serverName: `${server.name} (Files)` });
                }
             }
          }}
        />
      </div>

      <div className="w-px bg-sci-cyan/10 hover:bg-sci-cyan cursor-col-resize transition-colors flex items-center justify-center group z-10" onMouseDown={() => { isResizingLeft.current = true; document.body.style.cursor = 'col-resize'; }}>
        <div className="absolute w-4 h-full"></div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative h-screen">
        <SessionTabs />
        
        {/* Terminal Area - Always mounted to preserve state, hidden when not needed */}
        <div className={`flex-1 flex flex-col min-w-0 ${(!activeSessionId || isFileSession) ? 'hidden' : 'flex'}`}>
            <TerminalArea 
              commandToInsert={commandToInsert} 
              onAnalyzeLog={handleAnalyzeLogFromTerminal} 
            />
            <CommandInput onInsertCommand={handleInsertCommand} />
        </div>

        {/* File Editor Area */}
        {activeSessionId && isFileSession && (
             <div className="flex-1 flex overflow-hidden">
                 {/* File Browser Sidebar */}
                 <div className="w-64 border-r border-white/5 flex-shrink-0">
                     <FileBrowser serverId={activeSessionId || ''} onFileOpen={handleFileOpen} />
                 </div>
                 
                 {/* Main Editor Area */}
                 <div className="flex-1 flex flex-col min-w-0">
                     <FileTabs />
                     
                     <div className="flex-1 flex overflow-hidden">
                         <div className="flex-1 flex flex-col min-w-0">
                             {activeFileSessionId && fileSessions[activeFileSessionId] ? (
                                 <MonacoEditor 
                                     key={activeFileSessionId}
                                     session={fileSessions[activeFileSessionId]}
                                     onSave={handleFileSave}
                                     onClose={handleFileClose}
                                     onDownload={handleFileDownload}
                                     onBackup={handleFileBackup}
                                     onChange={handleFileChange}
                                 />
                             ) : (
                                 <div className="flex-1 flex items-center justify-center text-sci-dim">
                                     Select a file to edit
                                 </div>
                             )}
                         </div>
                         
                         <div className="w-72 border-l border-white/5 flex-shrink-0">
                             <FileOperations serverId={activeSessionId || ''} activeSessionId={activeFileSessionId} />
                         </div>
                     </div>
                 </div>
             </div>
        )}
 
        {!activeSessionId && (
              <div className="flex-1 flex flex-col items-center justify-center text-sci-dim opacity-30 select-none">
                  <div className="w-24 h-24 mb-6 rounded-full border-2 border-sci-cyan/20 flex items-center justify-center animate-pulse">
                      <Terminal size={48} />
                  </div>
                  <p className="text-lg font-sci tracking-widest uppercase">System Standby</p>
                  <p className="text-xs mt-2 font-mono">Waiting for neural link...</p>
              </div>
        )}
      </div>

      <div className="w-px bg-sci-cyan/10 hover:bg-sci-cyan cursor-col-resize transition-colors flex items-center justify-center group z-10" onMouseDown={() => { isResizingRight.current = true; document.body.style.cursor = 'col-resize'; }}>
        <div className="absolute w-4 h-full"></div>
      </div>

      {/* AI Panel Area */}
      <div style={{ width: rightWidth }} className={`flex-shrink-0 bg-sci-obsidian/40 backdrop-blur-md border-l border-white/5 ${isFileSession ? 'hidden' : ''}`}>
        <AIChatPanel 
          ref={aiChatPanelRef} 
          logs={logs} 
          activeServerId={activeSessionId} 
          onInsertCommand={handleInsertCommand} 
          onSwitchServer={handleSelectServer}
        />
      </div>

      {isAddModalOpen && (
        <AddServerModal 
          initialData={isAddModalOpen.editData} 
          parentId={isAddModalOpen.parentId} 
          onClose={() => setIsAddModalOpen(null)} 
          onSave={(data) => { 
            if(isAddModalOpen.editData) updateServer(isAddModalOpen.editData.id, data);
            else addServer(data); 
            setIsAddModalOpen(null); 
          }}
        />
      )}

      {passwordPrompt && (
        <PasswordModal 
          serverName={passwordPrompt.serverName}
          onClose={() => setPasswordPrompt(null)}
          onConfirm={handlePasswordConfirm}
        />
      )}
    </div>
  );
};

export default AISSH;
