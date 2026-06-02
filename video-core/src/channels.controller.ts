import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { google } from 'googleapis';
import { CurrentUser } from './current-user.decorator';
import type { RequestUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: { platform: 'YOUTUBE' | 'TIKTOK'; name: string; language: string; token?: string }) {
    return this.prisma.channel.create({
      data: {
        userId: user.id,
        platform: body.platform,
        name: body.name,
        language: body.language,
        tiktokAccessToken: body.platform === 'TIKTOK' ? body.token : undefined,
      },
    });
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.prisma.channel.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, string | boolean>) {
    return this.prisma.channel.updateMany({ where: { id, userId: user.id }, data: body }).then(() =>
      this.prisma.channel.findUnique({ where: { id } }),
    );
  }

  @Delete(':id')
  async delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    await this.prisma.channel.deleteMany({ where: { id, userId: user.id } });
    return { ok: true };
  }

  @Get('youtube/auth-url')
  youtubeAuthUrl() {
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
    return {
      url: oauth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/youtube.upload'],
      }),
    };
  }

  @Get('youtube/callback')
  async youtubeCallback(@Query('code') code: string) {
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
    const tokens = await oauth.getToken(code);
    return { connected: true, tokens: { hasAccessToken: Boolean(tokens.tokens.access_token), hasRefreshToken: Boolean(tokens.tokens.refresh_token) } };
  }
}
