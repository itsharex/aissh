import { create } from 'zustand';
import { FileSession, FileNode, FileOperation } from '../types';
import { fileService } from '../services/fileService';

interface FileState {
  // Current open file sessions
  fileSessions: Record<string, FileSession>;
  activeFileSessionId: string | null;
  
  // File browser state
  fileBrowserPath: Record<string, string>; // serverId -> currentPath
  fileTreeCache: Record<string, FileNode[]>; // serverId:path -> fileList
  isLoading: Record<string, boolean>; // serverId -> loading state
  
  // File operations
  fileOperations: FileOperation[];
  
  // Actions
  openFile: (serverId: string, filePath: string) => Promise<void>;
  closeFile: (sessionId: string) => void;
  updateFileContent: (sessionId: string, content: string) => void;
  saveFile: (sessionId: string) => Promise<boolean>;
  deleteFile: (serverId: string, filePath: string) => Promise<boolean>;
  backupFile: (serverId: string, filePath: string) => Promise<boolean>;
  createFile: (serverId: string, path: string, fileName: string) => Promise<boolean>;
  uploadFile: (serverId: string, path: string, file: File) => Promise<boolean>;
  downloadFile: (serverId: string, filePath: string, fileName: string) => Promise<void>;
  setFileBrowserPath: (serverId: string, path: string) => void;
  refreshFileTree: (serverId: string, path?: string) => Promise<void>;
  addFileOperation: (operation: FileOperation) => void;
  updateFileOperation: (id: string, updates: Partial<FileOperation>) => void;
  setActiveFileSessionId: (sessionId: string | null) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  // Initial state
  fileSessions: {},
  activeFileSessionId: null,
  fileBrowserPath: {},
  fileTreeCache: {},
  isLoading: {},
  fileOperations: [],
  
  // Actions
  openFile: async (serverId: string, filePath: string) => {
    const sessionId = `${serverId}:${filePath}`;
    const state = get();
    
    // If already open, just activate it
    if (state.fileSessions[sessionId]) {
      set({ activeFileSessionId: sessionId });
      return;
    }

    try {
      set(state => ({ isLoading: { ...state.isLoading, [serverId]: true } }));
      
      const content = await fileService.readFile(serverId, filePath);
      
      const session: FileSession = {
        id: sessionId,
        serverId,
        filePath,
        content,
        isModified: false,
        originalContent: content,
        // Simple language detection based on extension
        language: getLanguageFromExtension(filePath)
      };
      
      set(state => ({
        fileSessions: {
          ...state.fileSessions,
          [sessionId]: session
        },
        activeFileSessionId: sessionId,
        isLoading: { ...state.isLoading, [serverId]: false }
      }));
    } catch (error: any) {
      console.error('Failed to open file:', error);
      
      // Handle file too large error
      if (error.message && error.message.startsWith('FILE_TOO_LARGE')) {
          const size = parseInt(error.message.split(':')[1]);
          const sizeMB = (size / (1024 * 1024)).toFixed(2);
          // We can't use toast here easily as it's outside component context, 
          // but we can add a log entry via ssh store or just console error for now.
          // Or we can set a special error state in the session to show in UI.
          // For now, let's create a dummy session with error content.
          
          const session: FileSession = {
            id: sessionId,
            serverId,
            filePath,
            content: `⚠️ 文件过大 (${sizeMB} MB)\n\n为了保证浏览器性能，暂不支持在线编辑超过 1MB 的文件。\n请使用下载功能将文件下载到本地进行编辑。`,
            isModified: false,
            originalContent: '',
            language: 'markdown'
          };
          
          set(state => ({
            fileSessions: {
              ...state.fileSessions,
              [sessionId]: session
            },
            activeFileSessionId: sessionId,
            isLoading: { ...state.isLoading, [serverId]: false }
          }));
          return;
      }

      set(state => ({ isLoading: { ...state.isLoading, [serverId]: false } }));
    }
  },
  
  closeFile: (sessionId: string) => {
    set(state => {
      const newSessions = { ...state.fileSessions };
      delete newSessions[sessionId];
      
      let newActiveId = state.activeFileSessionId;
      if (state.activeFileSessionId === sessionId) {
        // Switch to another session if available
        const sessionIds = Object.keys(newSessions);
        newActiveId = sessionIds.length > 0 ? sessionIds[sessionIds.length - 1] : null;
      }
      
      return {
        fileSessions: newSessions,
        activeFileSessionId: newActiveId
      };
    });
  },
  
  updateFileContent: (sessionId: string, content: string) => {
    set(state => {
      const session = state.fileSessions[sessionId];
      if (!session) return state;
      
      return {
        fileSessions: {
          ...state.fileSessions,
          [sessionId]: {
            ...session,
            content,
            isModified: content !== session.originalContent
          }
        }
      };
    });
  },
  
  saveFile: async (sessionId: string): Promise<boolean> => {
    const state = get();
    const session = state.fileSessions[sessionId];
    if (!session) return false;
    
    try {
      await fileService.writeFile(session.serverId, session.filePath, session.content);
      
      // Update session state
      set(state => ({
        fileSessions: {
          ...state.fileSessions,
          [sessionId]: {
            ...session,
            isModified: false,
            originalContent: session.content
          }
        }
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  },
  
  deleteFile: async (serverId: string, filePath: string): Promise<boolean> => {
    try {
      await fileService.deleteFile(serverId, filePath);
      // Refresh current directory
      const path = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
      await get().refreshFileTree(serverId, path);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  },

  backupFile: async (serverId: string, filePath: string): Promise<boolean> => {
    try {
      await fileService.backupFile(serverId, filePath);
      const path = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
      await get().refreshFileTree(serverId, path);
      return true;
    } catch (error) {
      console.error('Failed to backup file:', error);
      return false;
    }
  },

  createFile: async (serverId: string, path: string, fileName: string): Promise<boolean> => {
    try {
      const fullPath = path.endsWith('/') ? `${path}${fileName}` : `${path}/${fileName}`;
      await fileService.createFile(serverId, fullPath);
      await get().refreshFileTree(serverId, path);
      return true;
    } catch (error) {
      console.error('Failed to create file:', error);
      return false;
    }
  },

  uploadFile: async (serverId: string, path: string, file: File): Promise<boolean> => {
    const opId = `upload-${Date.now()}-${file.name}`;
    try {
      get().addFileOperation({
        id: opId,
        type: 'upload',
        sourcePath: file.name,
        targetPath: path.endsWith('/') ? `${path}${file.name}` : `${path}/${file.name}`,
        status: 'in-progress',
        progress: 0,
        serverId
      });

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Content = await base64Promise;

      await fileService.uploadFile(
        serverId, 
        path, 
        file.name, 
        base64Content, 
        (progress) => {
          get().updateFileOperation(opId, { progress });
        }
      );

      get().updateFileOperation(opId, { status: 'completed', progress: 100 });
      
      await get().refreshFileTree(serverId, path);
      return true;
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      get().updateFileOperation(opId, { status: 'error', error: error.message });
      return false;
    }
  },

  downloadFile: async (serverId: string, filePath: string, fileName: string): Promise<void> => {
    try {
      const content = await fileService.readFile(serverId, filePath);
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('下载失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  },
  
  setFileBrowserPath: (serverId: string, path: string) => {
    set(state => ({
      fileBrowserPath: {
        ...state.fileBrowserPath,
        [serverId]: path
      }
    }));
    // Automatically refresh when path changes
    get().refreshFileTree(serverId, path);
  },
  
  refreshFileTree: async (serverId: string, path?: string) => {
    const state = get();
    const targetPath = path || state.fileBrowserPath[serverId] || '/'; // Default to root
    
    // Ensure we track the path if it wasn't set
    if (!state.fileBrowserPath[serverId]) {
        set(s => ({ fileBrowserPath: { ...s.fileBrowserPath, [serverId]: targetPath } }));
    }

    try {
      set(state => ({ isLoading: { ...state.isLoading, [serverId]: true } }));
      
      const files = await fileService.listFiles(serverId, targetPath);
      
      set(state => ({
        fileTreeCache: {
          ...state.fileTreeCache,
          [`${serverId}:${targetPath}`]: files
        },
        isLoading: { ...state.isLoading, [serverId]: false }
      }));
    } catch (error) {
      console.error('Failed to refresh file tree:', error);
      set(state => ({ isLoading: { ...state.isLoading, [serverId]: false } }));
    }
  },
  
  addFileOperation: (operation: FileOperation) => {
    set(state => ({
      fileOperations: [
        ...state.fileOperations,
        { ...operation, id: operation.id || `op-${Date.now()}` }
      ]
    }));
  },
  
  updateFileOperation: (id: string, updates: Partial<FileOperation>) => {
    set(state => ({
      fileOperations: state.fileOperations.map(op =>
        op.id === id ? { ...op, ...updates } : op
      )
    }));
  },

  setActiveFileSessionId: (sessionId: string | null) => {
    set({ activeFileSessionId: sessionId });
  }
}));

function getLanguageFromExtension(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  
  // If no dot in filename, it's likely a script or system file, use shell
  if (!fileName.includes('.')) {
    return 'shell';
  }

  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'jsx': return 'javascript';
    case 'tsx': return 'typescript';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'py': return 'python';
    case 'sh': 
    case 'log':
    case 'conf':
    case 'env':
    case 'ini':
      return 'shell';
    case 'yml':
    case 'yaml': return 'yaml';
    case 'xml': return 'xml';
    case 'sql': return 'sql';
    case 'java': return 'java';
    case 'c': return 'c';
    case 'cpp': return 'cpp';
    case 'go': return 'go';
    case 'rs': return 'rust';
    case 'php': return 'php';
    default: return 'plaintext';
  }
}
