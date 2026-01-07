import React, { useEffect, useState } from 'react';
import { useFileStore } from '../../store/useFileStore';
import { FileNode } from '../../types';
import { Folder, FileText, ChevronRight, ChevronDown, RefreshCw, Home, ArrowUp, Plus, Download, Trash2, Edit, Copy } from 'lucide-react';
import { Button } from '../../common/Button';

interface FileBrowserProps {
  serverId: string;
  onFileOpen: (filePath: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  file: FileNode | null;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({ serverId, onFileOpen }) => {
  const { 
    fileTreeCache, 
    fileBrowserPath, 
    isLoading, 
    refreshFileTree, 
    setFileBrowserPath,
    deleteFile,
    backupFile,
    createFile,
    downloadFile
  } = useFileStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const currentPath = fileBrowserPath[serverId] || '/';
  const fileList = fileTreeCache[`${serverId}:${currentPath}`] || [];
  const loading = isLoading[serverId];

  useEffect(() => {
    // Initial load if empty
    if (!fileTreeCache[`${serverId}:${currentPath}`]) {
      refreshFileTree(serverId, currentPath);
    }
  }, [serverId, currentPath]);

  const handleNavigate = (path: string) => {
    setFileBrowserPath(serverId, path);
  };

  const handleGoUp = () => {
    if (currentPath === '/') return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    handleNavigate(parentPath);
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file
    });
  };

  const handleCreateFile = async () => {
    const fileName = window.prompt('请输入文件名:');
    if (fileName) {
      const success = await createFile(serverId, currentPath, fileName);
      if (!success) {
        alert('创建文件失败');
      }
    }
  };

  const handleDeleteFile = async (file: FileNode) => {
    if (window.confirm(`确定要删除 ${file.name} 吗?`)) {
      const success = await deleteFile(serverId, file.path);
      if (!success) {
        alert('删除失败');
      }
    }
  };

  const handleBackupFile = async (file: FileNode) => {
    const success = await backupFile(serverId, file.path);
    if (!success) {
      alert('备份失败');
    }
  };

  const handleDownload = (file: FileNode) => {
    downloadFile(serverId, file.path, file.name);
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-sci-text text-sm">
      {/* Address Bar */}
      <div className="flex items-center p-2 border-b border-white/10 space-x-2">
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => handleNavigate('/')}
          disabled={loading}
          title="根目录"
        >
          <Home size={14} />
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={handleGoUp}
          disabled={currentPath === '/' || loading}
          title="上级目录"
        >
          <ArrowUp size={14} />
        </Button>
        <div className="flex-1 bg-[#161b22] px-2 py-1 rounded text-xs truncate border border-white/5">
          {currentPath}
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={handleCreateFile}
          disabled={loading}
          title="新建文件"
        >
          <Plus size={14} />
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => refreshFileTree(serverId, currentPath)}
          disabled={loading}
          title="刷新"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto relative">
        {loading && fileList.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sci-dim">
            加载中...
          </div>
        ) : (
          <div className="flex flex-col">
            {fileList.length === 0 ? (
              <div className="p-4 text-center text-sci-dim text-xs">
                空目录
              </div>
            ) : (
              fileList.map((file) => (
                <div 
                  key={file.id}
                  className="flex items-center px-3 py-1.5 hover:bg-[#161b22] cursor-pointer group transition-colors select-none"
                  onClick={() => {
                    if (file.type === 'folder') {
                      handleNavigate(file.path);
                    } else {
                      onFileOpen(file.path);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  <div className="mr-2 text-sci-cyan">
                    {file.type === 'folder' ? <Folder size={14} /> : <FileText size={14} />}
                  </div>
                  <div className="flex-1 truncate text-xs">
                    {file.name}
                  </div>
                  <div className="text-xs text-sci-dim w-16 text-right group-hover:text-white/70">
                    {formatSize(file.size)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div 
            className="fixed z-[100] bg-[#1c2128] border border-white/10 rounded-md shadow-xl py-1 min-w-[120px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.file?.type === 'file' && (
              <button 
                className="w-full flex items-center px-3 py-2 text-xs hover:bg-sci-cyan/20 text-white/90 transition-colors"
                onClick={() => {
                  if (contextMenu.file) onFileOpen(contextMenu.file.path);
                  setContextMenu(null);
                }}
              >
                <Edit size={12} className="mr-2" /> 编辑
              </button>
            )}
            <button 
              className="w-full flex items-center px-3 py-2 text-xs hover:bg-sci-cyan/20 text-white/90 transition-colors"
              onClick={() => {
                if (contextMenu.file) handleBackupFile(contextMenu.file);
                setContextMenu(null);
              }}
            >
              <Copy size={12} className="mr-2" /> 备份
            </button>
            <button 
              className="w-full flex items-center px-3 py-2 text-xs hover:bg-sci-cyan/20 text-white/90 transition-colors"
              onClick={() => {
                if (contextMenu.file) handleDownload(contextMenu.file);
                setContextMenu(null);
              }}
            >
              <Download size={12} className="mr-2" /> 下载
            </button>
            <div className="h-px bg-white/5 my-1" />
            <button 
              className="w-full flex items-center px-3 py-2 text-xs hover:bg-red-500/20 text-red-400 transition-colors"
              onClick={() => {
                if (contextMenu.file) handleDeleteFile(contextMenu.file);
                setContextMenu(null);
              }}
            >
              <Trash2 size={12} className="mr-2" /> 删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
