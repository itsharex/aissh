import React, { useRef } from 'react';
import { useFileStore } from '../../store/useFileStore';
import { Button } from '../../common/Button';
import { Upload, Download, Mail, Trash2, Copy, Move } from 'lucide-react';
import { CyberPanel } from '../../common/CyberPanel';

interface FileOperationsProps {
  serverId: string;
  activeSessionId: string | null;
}

export const FileOperations: React.FC<FileOperationsProps> = ({ serverId, activeSessionId }) => {
  const { 
    fileOperations, 
    addFileOperation, 
    fileSessions, 
    uploadFile,
    fileBrowserPath,
    backupFile,
    downloadFile
  } = useFileStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPath = fileBrowserPath[serverId] || '/';

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    for (const file of fileList) {
      await uploadFile(serverId, currentPath, file);
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleDownload = () => {
      if (!activeSessionId) return;
      const session = fileSessions[activeSessionId];
      if (session) {
        downloadFile(serverId, session.filePath, session.filePath.split('/').pop() || 'file');
      }
  };

  const handleBackup = async () => {
      if (!activeSessionId) return;
      const session = fileSessions[activeSessionId];
      if (session) {
        const success = await backupFile(serverId, session.filePath);
        if (success) {
          alert('备份成功');
        } else {
          alert('备份失败');
        }
      }
  };

  return (
    <CyberPanel className="h-full flex flex-col" variant="obsidian">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5">
        <span className="text-xs font-sci text-sci-cyan uppercase tracking-wider">
          文件操作
        </span>
      </div>

      {/* Action Buttons */}
      <div className="p-3 space-y-2">
        <Button
          size="sm"
          variant="sci-cyan"
          className="w-full"
          onClick={handleFileUpload}
          disabled={!serverId}
        >
          <Upload size={14} className="mr-2" />
          上传文件
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={!activeSessionId}
          onClick={handleDownload}
        >
          <Download size={14} className="mr-2" />
          下载文件
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={!activeSessionId}
          onClick={handleBackup}
        >
          <Copy size={14} className="mr-2" />
          备份文件
        </Button>
      </div>

      {/* Operations List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <span className="text-xs font-sci text-sci-cyan uppercase tracking-wider block mb-2">
          任务队列
        </span>
        
        <div className="space-y-2">
          {fileOperations.filter(op => op.serverId === serverId).length === 0 ? (
            <div className="text-xs text-sci-dim text-center py-4">暂无活动任务</div>
          ) : (
            fileOperations.filter(op => op.serverId === serverId).map(operation => (
              <div key={operation.id} className="p-2 bg-sci-base/50 rounded border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs truncate max-w-[120px]" title={operation.sourcePath}>
                    {operation.type.toUpperCase()}: {operation.sourcePath}
                  </span>
                  <span className={`text-[10px] uppercase ${
                    operation.status === 'completed' ? 'text-sci-green' :
                    operation.status === 'error' ? 'text-sci-red' :
                    operation.status === 'in-progress' ? 'text-sci-yellow' :
                    'text-sci-dim'
                  }`}>
                    {operation.status}
                  </span>
                </div>
                
                {operation.status === 'in-progress' && operation.progress !== undefined && (
                  <div className="h-1 bg-sci-base rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sci-cyan transition-all duration-300"
                      style={{ width: `${operation.progress}%` }}
                    ></div>
                  </div>
                )}
                
                {operation.error && (
                  <div className="mt-1 text-[10px] text-sci-red truncate" title={operation.error}>
                    {operation.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </CyberPanel>
  );
};
