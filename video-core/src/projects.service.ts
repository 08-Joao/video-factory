import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { QueueService } from './queue.service';
import { StorageService } from './storage.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, body: { theme: string; suggestion?: string }) {
    const project = await this.prisma.project.create({
      data: { userId, theme: body.theme, suggestion: body.suggestion },
    });
    await this.queue.add('script-generation', { projectId: project.id, autoContinue: false });
    return project;
  }

  async list(userId: string, query: { page?: string; status?: string }) {
    const page = Math.max(1, Number(query.page || 1));
    const where = { userId, ...(query.status ? { status: query.status as never } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { script: true, thumbnail: true, videoFiles: true, publishJobs: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 12,
        take: 12,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total, page, pageSize: 12 };
  }

  async get(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        script: true,
        translations: true,
        audioFiles: true,
        videoFiles: { orderBy: [{ language: 'asc' }, { type: 'asc' }, { partNumber: 'asc' }] },
        thumbnail: true,
        publishJobs: { include: { channel: true, videoFile: true } },
      },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    if (project.userId !== userId) throw new ForbiddenException('Projeto pertence a outro usuário');
    return project;
  }

  async approve(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.project.update({ where: { id }, data: { status: 'SCRIPT_APPROVED' } });
  }

  async reject(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.project.update({ where: { id }, data: { status: 'SCRIPT_REJECTED' } });
  }

  async delete(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.project.delete({ where: { id } });
    await this.storage.deleteDirectory(`projects/${id}`);
    return { ok: true };
  }

  async deleteVideo(userId: string, id: string, videoId: string) {
    await this.get(userId, id);
    const video = await this.prisma.videoFile.findUnique({ where: { id: videoId } });
    if (!video || video.projectId !== id) throw new NotFoundException('Vídeo não encontrado');
    await this.prisma.videoFile.delete({ where: { id: videoId } });
    await this.storage.delete(video.filePath);
    await this.storage.delete(video.filePath.replace(/\.mp4$/i, '.jpg'));
    return { ok: true };
  }

  async publish(userId: string, id: string, body: { channelIds: string[]; includeShorts?: boolean }) {
    await this.get(userId, id);
    await this.queue.add('publishing', {
      projectId: id,
      channelIds: body.channelIds || [],
      includeShorts: body.includeShorts !== false,
    });
    return { queued: true };
  }

  async runStep(userId: string, id: string, step: 'translation' | 'audio-generation' | 'thumbnail' | 'video-editing') {
    await this.get(userId, id);
    if (!['translation', 'audio-generation', 'thumbnail', 'video-editing'].includes(step)) throw new BadRequestException('Etapa inválida');
    await this.queue.add(step, { projectId: id, autoContinue: false });
    return { queued: true, step };
  }

  async regenerateAudio(userId: string, id: string, audioId: string, body: { force?: boolean; provider?: string; voice?: string }) {
    await this.get(userId, id);
    const audio = await this.prisma.audioFile.findUnique({ where: { id: audioId } });
    if (!audio || audio.projectId !== id) throw new NotFoundException('Áudio não encontrado');
    if (audio.status === 'DONE' && !body.force) {
      throw new BadRequestException('Áudio pronto. Envie force=true para regerar.');
    }
    await this.prisma.audioFile.update({
      where: { id: audio.id },
      data: {
        status: 'PENDING',
        provider: body.provider || audio.provider || 'elevenlabs',
        voice: body.voice || audio.voice || audio.elevenLabsVoiceId,
        errorMessage: null,
        errorStack: null,
      },
    });
    await this.queue.add('audio-generation', {
      projectId: id,
      audioId: audio.id,
      language: audio.language,
      force: true,
      provider: body.provider || audio.provider || 'elevenlabs',
      voice: body.voice || audio.voice || audio.elevenLabsVoiceId,
      autoContinue: false,
    });
    return { queued: true, audioId: audio.id, language: audio.language };
  }

  async generateThumbnail(userId: string, id: string, body: { force?: boolean; provider?: string; style?: string }) {
    const project = await this.get(userId, id);
    if (project.thumbnail?.status === 'DONE' && !body.force) {
      throw new BadRequestException('Thumbnail pronta. Envie force=true para regerar.');
    }
    await this.queue.add('thumbnail', {
      projectId: id,
      force: Boolean(body.force),
      provider: body.provider || 'openai',
      style: body.style || 'cartoon',
      autoContinue: false,
    });
    return { queued: true, projectId: id };
  }

  async logs(userId: string, id: string, query: { action?: string }) {
    await this.get(userId, id);
    return this.prisma.processingLog.findMany({
      where: { projectId: id, ...(query.action ? { action: query.action } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
