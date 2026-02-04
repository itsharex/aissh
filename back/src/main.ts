import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';

async function bootstrap(): Promise<void> {
  const app: INestApplication = await NestFactory.create(AppModule);
  app.enableCors();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  const httpServer: Server = app.getHttpServer();
  const address = httpServer.address() as AddressInfo | null;
  const actualPort = address?.port ?? port;

  if (process.send) {
    process.send({ type: 'server-port', port: actualPort });
    console.log(`Backend started on random port: ${actualPort}`);
  } else {
    console.log(`Backend started on port: ${actualPort}`);
  }
}

void bootstrap();
