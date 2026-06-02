import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import type { RequestUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: { theme: string; suggestion?: string }) {
    return this.projects.create(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: { page?: string; status?: string }) {
    return this.projects.list(user.id, query);
  }

  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.projects.get(user.id, id);
  }

  @Patch(':id/approve')
  approve(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() _body: { autoRun?: boolean }) {
    return this.projects.approve(user.id, id);
  }

  @Patch(':id/reject')
  reject(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.projects.reject(user.id, id);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { channelIds: string[]; includeShorts?: boolean }) {
    return this.projects.publish(user.id, id, body);
  }

  @Post(':id/run/:step')
  runStep(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('step') step: 'translation' | 'audio-generation' | 'thumbnail' | 'video-editing') {
    return this.projects.runStep(user.id, id, step);
  }

  @Post(':id/audio/:audioId/regenerate')
  regenerateAudio(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('audioId') audioId: string,
    @Body() body: { force?: boolean; provider?: string; voice?: string },
  ) {
    return this.projects.regenerateAudio(user.id, id, audioId, body);
  }

  @Post(':id/thumbnail/generate')
  generateThumbnail(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { force?: boolean; provider?: string; style?: string },
  ) {
    return this.projects.generateThumbnail(user.id, id, body);
  }

  @Get(':id/logs')
  logs(@CurrentUser() user: RequestUser, @Param('id') id: string, @Query() query: { action?: string }) {
    return this.projects.logs(user.id, id, query);
  }

  @Delete(':id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.projects.delete(user.id, id);
  }

  @Delete(':id/videos/:videoId')
  deleteVideo(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('videoId') videoId: string) {
    return this.projects.deleteVideo(user.id, id, videoId);
  }
}
