import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import type { RequestUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  get(@CurrentUser() user: RequestUser) {
    return this.prisma.userSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
  }

  @Patch()
  update(
    @CurrentUser() user: RequestUser,
    @Body() body: { viralScoreThreshold?: number; defaultLanguages?: string[]; defaultVoiceId?: string; autoRunAfterApproval?: boolean },
  ) {
    return this.prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        viralScoreThreshold: body.viralScoreThreshold,
        defaultLanguages: body.defaultLanguages,
        defaultVoiceId: body.defaultVoiceId,
        autoRunAfterApproval: body.autoRunAfterApproval,
      },
      update: {
        viralScoreThreshold: body.viralScoreThreshold,
        defaultLanguages: body.defaultLanguages,
        defaultVoiceId: body.defaultVoiceId,
        autoRunAfterApproval: body.autoRunAfterApproval,
      },
    });
  }
}
