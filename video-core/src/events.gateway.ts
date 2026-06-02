import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN?.split(',') || true, credentials: true } })
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token = String(client.handshake.auth?.token || client.handshake.headers.authorization || '').replace(
      /^Bearer\s+/,
      '',
    );
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET || 'dev-secret',
      });
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  progress(userId: string, payload: { projectId: string; status?: string; step: string; progress: number; message: string }) {
    this.emitToUser(userId, 'job:progress', payload);
    if (payload.status) this.emitToUser(userId, 'project:status', payload);
  }
}
