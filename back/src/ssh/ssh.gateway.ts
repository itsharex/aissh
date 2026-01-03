import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SshService, SshConnectionConfig } from './ssh.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SshGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly sshService: SshService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.sshService.disconnectAll(client.id);
  }

  @SubscribeMessage('ssh-connect')
  handleConnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() config: SshConnectionConfig,
  ) {
    console.log(`Client ${client.id} requesting connection to ${config.ip} (Server: ${config.serverId})`);
    this.sshService.createConnection(client.id, config, this.server);
  }

  @SubscribeMessage('ssh-command')
  handleCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: string; command: string },
  ) {
    this.sshService.executeCommand(client.id, payload.serverId, payload.command);
  }

  @SubscribeMessage('ssh-input')
  handleInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: string; data: string },
  ) {
    this.sshService.writeToStream(client.id, payload.serverId, payload.data);
  }

  @SubscribeMessage('ssh-resize')
  handleResize(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: string; cols: number; rows: number },
  ) {
    this.sshService.resize(client.id, payload.serverId, payload.cols, payload.rows);
  }

  @SubscribeMessage('ssh-exec')
  async handleExec(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: string; command: string },
  ) {
    try {
      const output = await this.sshService.exec(client.id, payload.serverId, payload.command);
      return { status: 'ok', output };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  @SubscribeMessage('ssh-disconnect')
  handleDisconnectRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: string },
  ) {
    this.sshService.disconnect(client.id, payload.serverId);
  }
}
