import { Module } from '@nestjs/common';
import { SshService } from './ssh.service';
import { SshGateway } from './ssh.gateway';

@Module({
  providers: [SshService, SshGateway],
})
export class SshModule {}
