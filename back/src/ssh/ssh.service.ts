import { Injectable } from '@nestjs/common';
import { Client, ClientChannel, ConnectConfig } from 'ssh2';
import { Server } from 'socket.io';

export class SshConnectionConfig {
  ip: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  serverId: string;
  algorithms?: ConnectConfig['algorithms'];
  hostVerifier?: (keyHash: string) => boolean;
}

export enum SshErrorType {
  TIMEOUT = 'timeout',
  CONNECTION_REFUSED = 'connection_refused',
  AUTH_FAILED = 'auth_failed',
  HOST_NOT_FOUND = 'host_not_found',
  HANDSHAKE_FAILED = 'handshake_failed',
  PERMISSION_DENIED = 'permission_denied',
  UNKNOWN = 'unknown',
}

interface SshError {
  errorType: SshErrorType;
  message: string;
}

interface SshErrorEvent {
  message: string;
  level?: string;
}

@Injectable()
export class SshService {
  private sessions = new Map<
    string,
    { client: Client; stream?: ClientChannel }
  >();
  private readonly termTypes = ['xterm-256color', 'xterm', 'vt100', 'linux'];

  createConnection(
    socketId: string,
    config: SshConnectionConfig,
    server: Server,
  ): void {
    const sessionKey = this.getSessionKey(socketId, config.serverId);

    this.disconnect(socketId, config.serverId);

    const conn = new Client();
    const currentTermIndex = 0;

    conn.on('ready', () => {
      server.to(socketId).emit('ssh-status', {
        serverId: config.serverId,
        status: 'connected',
        message: `Connected to ${config.ip}`,
      });

      this.tryShell(
        conn,
        socketId,
        config,
        server,
        currentTermIndex,
        sessionKey,
      );
    });

    conn.on(
      'keyboard-interactive',
      (name, instructions, lang, prompts, finish) => {
        if (prompts.length > 0 && config.password) {
          const responses = prompts.map(() => config.password as string);
          finish(responses);
        } else {
          finish([]);
        }
      },
    );

    conn.on('error', (err: unknown) => {
      const errorInfo = this.parseError(err as SshErrorEvent);
      server.to(socketId).emit('ssh-error', {
        serverId: config.serverId,
        errorType: errorInfo.errorType,
        message: errorInfo.message,
      });
      this.sessions.delete(sessionKey);
    });

    conn.on('end', () => {
      server.to(socketId).emit('ssh-status', {
        serverId: config.serverId,
        status: 'disconnected',
      });
      this.sessions.delete(sessionKey);
    });

    conn.on('close', () => {
      this.sessions.delete(sessionKey);
    });

    try {
      const connectConfig: ConnectConfig = {
        host: config.ip,
        port: config.port || 22,
        username: config.username,
        readyTimeout: 20000,
        keepaliveInterval: 60000,
        keepaliveCountMax: 3,
        tryKeyboard: true,
      };

      if (config.password) {
        connectConfig.password = config.password;
      }

      if (config.privateKey) {
        connectConfig.privateKey = config.privateKey;
        if (config.passphrase) {
          connectConfig.passphrase = config.passphrase;
        }
      }

      if (config.algorithms) {
        connectConfig.algorithms = config.algorithms;
      } else {
        connectConfig.algorithms = {
          kex: [
            'curve25519-sha256',
            'curve25519-sha256@libssh.org',
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521',
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group15-sha512',
            'diffie-hellman-group16-sha512',
            'diffie-hellman-group18-sha512',
          ],
          cipher: [
            'aes256-gcm@openssh.com',
            'aes128-gcm@openssh.com',
            'aes256-ctr',
            'aes192-ctr',
            'aes128-ctr',
            'aes256-cbc',
            'aes192-cbc',
            'aes128-cbc',
          ],
          serverHostKey: [
            'ssh-ed25519',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521',
            'rsa-sha2-512',
            'rsa-sha2-256',
            'ssh-rsa',
          ],
          hmac: [
            'hmac-sha2-256-etm@openssh.com',
            'hmac-sha2-512-etm@openssh.com',
            'hmac-sha2-256',
            'hmac-sha2-512',
            'hmac-sha1',
          ],
        };
      }

      if (config.hostVerifier) {
        connectConfig.hostVerifier = config.hostVerifier;
      }

      conn.connect(connectConfig);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      server.to(socketId).emit('ssh-error', {
        serverId: config.serverId,
        errorType: SshErrorType.UNKNOWN,
        message: 'Connection failed: ' + errorMessage,
      });
    }
  }

  private tryShell(
    conn: Client,
    socketId: string,
    config: SshConnectionConfig,
    server: Server,
    termIndex: number,
    sessionKey: string,
  ): void {
    if (termIndex >= this.termTypes.length) {
      server.to(socketId).emit('ssh-error', {
        serverId: config.serverId,
        errorType: SshErrorType.UNKNOWN,
        message: 'Failed to start shell with any terminal type',
      });
      conn.end();
      return;
    }

    const termType = this.termTypes[termIndex];

    conn.shell({ term: termType, rows: 24, cols: 80 }, (err, stream) => {
      if (err) {
        if (termIndex < this.termTypes.length - 1) {
          this.tryShell(
            conn,
            socketId,
            config,
            server,
            termIndex + 1,
            sessionKey,
          );
        } else {
          server.to(socketId).emit('ssh-error', {
            serverId: config.serverId,
            errorType: SshErrorType.UNKNOWN,
            message: 'Failed to start shell: ' + err.message,
          });
          conn.end();
        }
        return;
      }

      this.sessions.set(sessionKey, { client: conn, stream });

      stream.on('close', () => {
        server.to(socketId).emit('ssh-status', {
          serverId: config.serverId,
          status: 'disconnected',
        });
        this.sessions.delete(sessionKey);
        conn.end();
      });

      stream.on('data', (data: Buffer) => {
        server.to(socketId).emit('ssh-data', {
          serverId: config.serverId,
          data: data.toString('utf-8'),
        });
      });

      stream.stderr.on('data', (data: Buffer) => {
        server.to(socketId).emit('ssh-data', {
          serverId: config.serverId,
          data: data.toString('utf-8'),
        });
      });
    });
  }

  private parseError(err: SshErrorEvent): SshError {
    const message = err.message || '';
    const level = err.level || '';

    if (level === 'client-timeout' || message.includes('timeout')) {
      return {
        errorType: SshErrorType.TIMEOUT,
        message: '连接超时，请检查网络或IP地址是否正确',
      };
    }

    if (message.includes('ECONNREFUSED')) {
      return {
        errorType: SshErrorType.CONNECTION_REFUSED,
        message: '连接被拒绝，请检查SSH端口是否正确或服务是否运行',
      };
    }

    if (message.includes('ENOTFOUND') || message.includes('EAI_AGAIN')) {
      return {
        errorType: SshErrorType.HOST_NOT_FOUND,
        message: '无法解析主机地址，请检查IP地址或DNS设置',
      };
    }

    if (
      message.includes('Authentication failed') ||
      message.includes('All configured authentication methods failed')
    ) {
      return {
        errorType: SshErrorType.AUTH_FAILED,
        message: '认证失败，请检查用户名、密码或密钥是否正确',
      };
    }

    if (message.includes('Permission denied')) {
      return {
        errorType: SshErrorType.PERMISSION_DENIED,
        message: '权限被拒绝，请检查用户权限或SSH配置',
      };
    }

    if (
      message.includes('handshake') ||
      message.includes('Unable to exchange')
    ) {
      return {
        errorType: SshErrorType.HANDSHAKE_FAILED,
        message: '协议握手失败，可能是不兼容的SSH版本或加密算法',
      };
    }

    return {
      errorType: SshErrorType.UNKNOWN,
      message: '连接错误: ' + message,
    };
  }

  executeCommand(socketId: string, serverId: string, command: string): void {
    const session = this.sessions.get(this.getSessionKey(socketId, serverId));
    if (session?.stream) {
      const cmd = command.endsWith('\n') ? command : command + '\n';
      session.stream.write(cmd);
    }
  }

  writeToStream(socketId: string, serverId: string, data: string): void {
    const session = this.sessions.get(this.getSessionKey(socketId, serverId));
    if (session?.stream) {
      session.stream.write(data);
    }
  }

  resize(socketId: string, serverId: string, cols: number, rows: number): void {
    const session = this.sessions.get(this.getSessionKey(socketId, serverId));
    if (session?.stream) {
      session.stream.setWindow(rows, cols, 0, 0);
    }
  }

  async exec(
    socketId: string,
    serverId: string,
    command: string,
  ): Promise<string> {
    const session = this.sessions.get(this.getSessionKey(socketId, serverId));
    if (!session?.client) {
      throw new Error('Session not found or disconnected');
    }

    return new Promise((resolve, reject) => {
      session.client.exec(command, (err, stream) => {
        if (err) return reject(err);

        let output = '';

        stream.on('close', () => {
          resolve(output);
        });

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          output += data.toString();
        });
      });
    });
  }

  disconnect(socketId: string, serverId: string): void {
    const sessionKey = this.getSessionKey(socketId, serverId);
    const session = this.sessions.get(sessionKey);
    if (session) {
      session.client.end();
      this.sessions.delete(sessionKey);
    }
  }

  disconnectAll(socketId: string): void {
    for (const [key, session] of this.sessions.entries()) {
      if (key.startsWith(socketId + ':')) {
        session.client.end();
        this.sessions.delete(key);
      }
    }
  }

  private getSessionKey(socketId: string, serverId: string): string {
    return `${socketId}:${serverId}`;
  }
}
