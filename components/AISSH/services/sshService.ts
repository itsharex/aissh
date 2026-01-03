import { io, Socket } from 'socket.io-client';
import { LogEntry } from '../types';

class SSHConnection {
  private static instance: SSHConnection;
  private socket: Socket | null = null;
  private logListeners: Set<(log: LogEntry) => void> = new Set();
  private dataListeners: Set<(data: string, serverId: string) => void> = new Set();
  private statusListeners: Set<(status: { serverId: string; status: string; message?: string }) => void> = new Set();

  private constructor() {
    // 自动检测环境：生产环境下使用相对路径，开发环境下使用 localhost:3001
    const socketUrl = process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:3001';
    this.socket = io(socketUrl, {
      autoConnect: false,
    });

    this.socket.on('connect', () => {
      console.log('Connected to backend');
    });

    this.socket.on('ssh-data', (data: { serverId: string; data: string }) => {
      // Emit raw data for xterm
      this.dataListeners.forEach(cb => cb(data.data, data.serverId));

      // Keep legacy log behavior for AI/Log view
      const lines = data.data.split('\n');
      lines.forEach(line => {
          if (line.trim().length > 0) {
             this.emitLog('info', line.replace(/\r/g, ''), data.serverId);
          }
      });
    });

    this.socket.on('ssh-error', (data: { serverId: string; message: string }) => {
      this.emitLog('error', data.message, data.serverId);
      // 将错误信息直接输出到终端，使用红色
      this.dataListeners.forEach(cb => cb(`\r\n\x1b[31m[Error] ${data.message}\x1b[0m\r\n`, data.serverId));
      this.statusListeners.forEach(cb => cb({ serverId: data.serverId, status: 'error', message: data.message }));
    });

    this.socket.on('ssh-status', (data: { serverId: string; status: string; message?: string }) => {
      if (data.message) {
        this.emitLog('info', data.message, data.serverId);
        // 将状态信息直接输出到终端，使用绿色（连接成功）或黄色（其他状态）
        const color = data.status === 'connected' ? '\x1b[32m' : '\x1b[33m';
        this.dataListeners.forEach(cb => cb(`\r\n${color}[Status] ${data.message}\x1b[0m\r\n`, data.serverId));
      }
      this.statusListeners.forEach(cb => cb(data));
    });
  }

  public static getInstance(): SSHConnection {
    if (!SSHConnection.instance) {
      SSHConnection.instance = new SSHConnection();
    }
    return SSHConnection.instance;
  }

  connect(ip: string, username: string, password: string, serverId: string) {
    if (!this.socket?.connected) {
      this.socket?.connect();
    }

    // 在终端显示连接中状态，使用青色
    this.dataListeners.forEach(cb => cb(`\r\n\x1b[36m[Status] Connecting to ${ip}...\x1b[0m\r\n`, serverId));

    this.socket?.emit('ssh-connect', { ip, username, password, serverId });
    
    return new Promise((resolve) => {
       resolve(true); 
    });
  }

  onLog(callback: (log: LogEntry) => void) {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  onData(callback: (data: string, serverId: string) => void) {
    this.dataListeners.add(callback);
    return () => this.dataListeners.delete(callback);
  }

  onStatus(callback: (status: { serverId: string; status: string; message?: string }) => void) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private emitLog(type: LogEntry['type'], content: string, serverId: string) {
    const log = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      content,
      serverId
    };
    this.logListeners.forEach(cb => cb(log));
  }

  // AI 专用的命令执行方法，返回执行结果字符串
  async executeCommand(command: string, serverId: string): Promise<string> {
    this.emitLog('command', `$ ${command}`, serverId);
    
    // 将 AI 命令显式写入 xterm 数据流，模拟回显
    // 使用洋红色 (Magenta) \x1b[35m 区分 AI 操作
    this.dataListeners.forEach(cb => cb(`\r\n\x1b[35m[AI] $ ${command}\x1b[0m\r\n`, serverId));
    
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject("Not connected to backend");
      }
      
      this.socket.emit('ssh-exec', { serverId, command }, (response: { status: string, output?: string, message?: string }) => {
        if (response.status === 'ok') {
          // Log the output to the terminal as well, so the user sees it happened
          if (response.output) {
            response.output.split('\n').forEach(line => {
              if (line.trim()) this.emitLog('info', line, serverId);
            });

            // 将输出写入 xterm
            // 确保换行符转换为 \r\n 以正确显示
            const formattedOutput = response.output.replace(/\n/g, '\r\n');
            this.dataListeners.forEach(cb => cb(formattedOutput, serverId));
            // 确保末尾有换行
            if (!formattedOutput.endsWith('\r\n')) {
                 this.dataListeners.forEach(cb => cb('\r\n', serverId));
            }
          }
          resolve(response.output || '');
        } else {
          const errorMsg = response.message || 'Unknown error';
          this.emitLog('error', errorMsg, serverId);
          
          // 将错误写入 xterm
          this.dataListeners.forEach(cb => cb(`\r\n\x1b[31m[AI Error]: ${errorMsg}\x1b[0m\r\n`, serverId));
          
          resolve(`Error: ${errorMsg}`); // Resolve with error text so AI sees it
        }
      });
    });
  }

  // 传统的发送方法，不等待结果 (Used by legacy terminal input)
  sendCommand(command: string, serverId: string) {
    this.emitLog('command', `$ ${command}`, serverId);
    this.socket?.emit('ssh-command', { serverId, command });
  }

  // Raw input for xterm (keypresses, etc)
  sendInput(data: string, serverId: string) {
    this.socket?.emit('ssh-input', { serverId, data });
  }

  resize(cols: number, rows: number, serverId: string) {
    this.socket?.emit('ssh-resize', { serverId, cols, rows });
  }

  // 向本地终端写入原始数据
  writeRaw(data: string, serverId: string) {
    this.dataListeners.forEach(cb => cb(data, serverId));
  }

  disconnect(serverId: string) {
    if (!this.socket?.connected) {
      this.statusListeners.forEach(cb => cb({ serverId, status: 'disconnected', message: 'Disconnected (socket idle)' }));
      return;
    }
    this.dataListeners.forEach(cb => cb(`\r\n\x1b[33m[Status] Disconnecting...\x1b[0m\r\n`, serverId));
    this.socket.emit('ssh-disconnect', { serverId });
    this.statusListeners.forEach(cb => cb({ serverId, status: 'disconnected', message: 'Disconnected by user' }));
  }
}

export const sshManager = SSHConnection.getInstance();
