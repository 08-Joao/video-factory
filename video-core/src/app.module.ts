import { Module } from '@nestjs/common';
import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from './users.service';
import { SettingsController } from './settings.controller';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ChannelsController } from './channels.controller';
import { BackgroundVideosController } from './background-videos.controller';
import { StorageService } from './storage.service';
import { QueueService } from './queue.service';
import { ProcessingService } from './processing.service';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as JwtSignOptions['expiresIn'] },
    }),
    ServeStaticModule.forRoot({
      rootPath: process.env.STORAGE_PATH || join(process.cwd(), 'storage'),
      serveRoot: '/files',
    }),
  ],
  controllers: [
    AuthController,
    SettingsController,
    ProjectsController,
    ChannelsController,
    BackgroundVideosController,
  ],
  providers: [
    PrismaService,
    AuthService,
    JwtAuthGuard,
    UsersService,
    ProjectsService,
    StorageService,
    QueueService,
    ProcessingService,
    EventsGateway,
  ],
})
export class AppModule {}
