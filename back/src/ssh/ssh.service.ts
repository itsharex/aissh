import { Injectable } from '@nestjs/common';
import { Client, ClientChannel } from 'ssh2';
import { Server } from 'socket.io';

export class SshConnectionConfig {
  ip: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  serverId: string;
}

@Injectable()
export class SshService {
  private sessions = new Map<string, { client: Client; stream?: ClientChannel }>();

  createConnection(socketId: string, config: SshConnectionConfig, server: Server) {
    const sessionKey = this.getSessionKey(socketId, config.serverId);
    
    // Close existing session if any
    this.disconnect(socketId, config.serverId);

    const conn = new Client();

    conn.on('ready', () => {
      server.to(socketId).emit('ssh-status', { 
        serverId: config.serverId, 
        status: 'connected',
        message: `Connected to ${config.ip}`
      });

      conn.shell({ term: 'xterm-256color', rows: 24, cols: 80 }, (err, stream) => {
        if (err) {
          server.to(socketId).emit('ssh-error', { 
            serverId: config.serverId, 
            message: 'Failed to start shell: ' + err.message 
          });
          return;
        }

        this.sessions.set(sessionKey, { client: conn, stream });

        stream.on('close', () => {
          server.to(socketId).emit('ssh-status', { 
            serverId: config.serverId, 
            status: 'disconnected' 
          });
          this.sessions.delete(sessionKey);
          conn.end();
        }).on('data', (data: Buffer) => {
          server.to(socketId).emit('ssh-data', { 
            serverId: config.serverId, 
            data: data.toString('utf-8') 
          });
        });
      });
    }).on('error', (err: any) => {
      let message = err.message;
      if (err.level === 'client-timeout') {
        message = 'Connection timed out (5s)';
      }
      server.to(socketId).emit('ssh-error', { 
        serverId: config.serverId, 
        message: 'Connection error: ' + message 
      });
      this.sessions.delete(sessionKey);
    }).on('end', () => {
      server.to(socketId).emit('ssh-status', { 
        serverId: config.serverId, 
        status: 'disconnected' 
      });
      this.sessions.delete(sessionKey);
    });

    try {
      conn.connect({
        host: config.ip,
        port: config.port || 22,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        readyTimeout: 5000,
      });
    } catch (error) {
       server.to(socketId).emit('ssh-error', { 
        serverId: config.serverId, 
        message: 'Connection failed: ' + error.message 
      });
    }
  }

  executeCommand(socketId: string, serverId: string, command: string) {
    const session = this.sessions.get(this.getSessionKey(socketId, serverId));
    if (session && session.stream) {
      // If it's a shell stream, we write to it.
      // Append newline if not present, as terminals usually expect enter
      const cmd = command.endsWith('\n') ? command : command + '\n';
      session.stream.write(cmd);
    }
  }

  writeToStream(socketId: string, serverId: string, data: string) {
    const session = this.sessions.get(this.getSessionKey(socketId, serverId));
    if (session && session.stream) {
        // Use a small buffer if needed, but ssh2 usually handles this well.
        // Direct write is async in nature but we don't await it here.
        // For heavy load, we might want to check stream.write return value (backpressure).
        const ok = session.stream.write(data);
        // if (!ok) { ... handle backpressure ... }
    }
  }

  resize(socketId: string, serverId: string, cols: number, rows: number) {
    const session = this.sessions.get(this.getSessionKey(socketId, serverId));
    if (session && session.stream) {
      session.stream.setWindow(rows, cols, 0, 0);
    }
  }

  async exec(socketId: string, serverId: string, command: string): Promise<string> {
    const session = this.sessions.get(this.getSessionKey(socketId, serverId));
    if (!session || !session.client) {
      throw new Error('Session not found or disconnected');
    }

    return new Promise((resolve, reject) => {
      session.client.exec(command, (err, stream) => {
        if (err) return reject(err);
        
        let output = '';
        
        stream.on('close', (code, signal) => {
          resolve(output);
        }).on('data', (data: Buffer) => {
          output += data.toString();
        }).stderr.on('data', (data: Buffer) => {
          output += data.toString();
        });
      });
    });
  }

  disconnect(socketId: string, serverId: string) {
    const sessionKey = this.getSessionKey(socketId, serverId);
    const session = this.sessions.get(sessionKey);
    if (session) {
      session.client.end();
      this.sessions.delete(sessionKey);
    }
  }

  disconnectAll(socketId: string) {
    for (const [key, session] of this.sessions.entries()) {
      if (key.startsWith(socketId + ':')) {
        session.client.end();
        this.sessions.delete(key);
      }
    }
  }

  private getSessionKey(socketId: string, serverId: string) {
    return `${socketId}:${serverId}`;
  }
}
