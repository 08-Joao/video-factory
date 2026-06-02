import { BadRequestException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const projectId = 'project-1';
  const userId = 'user-1';
  const audioId = 'audio-1';

  const createService = (audioOverrides: Record<string, unknown> = {}) => {
    const audio = {
      id: audioId,
      projectId,
      language: 'pt-BR',
      status: 'FAILED',
      provider: 'elevenlabs',
      voice: 'voice-1',
      elevenLabsVoiceId: 'voice-1',
      ...audioOverrides,
    };
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({ id: projectId, userId }),
      },
      audioFile: {
        findUnique: jest.fn().mockResolvedValue(audio),
        update: jest.fn().mockResolvedValue({ ...audio, status: 'PENDING' }),
      },
    };
    const queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };
    const storage = {
      deleteDirectory: jest.fn(),
    };

    return {
      service: new ProjectsService(prisma as never, queue as never, storage as never),
      prisma,
      queue,
    };
  };

  it('queues regeneration for the requested audio id', async () => {
    const { service, prisma, queue } = createService();

    await expect(service.regenerateAudio(userId, projectId, audioId, {})).resolves.toEqual({
      queued: true,
      audioId,
      language: 'pt-BR',
    });

    expect(prisma.audioFile.findUnique).toHaveBeenCalledWith({ where: { id: audioId } });
    expect(prisma.audioFile.update).toHaveBeenCalledWith({
      where: { id: audioId },
      data: {
        status: 'PENDING',
        provider: 'elevenlabs',
        voice: 'voice-1',
        errorMessage: null,
        errorStack: null,
      },
    });
    expect(queue.add).toHaveBeenCalledWith('audio-generation', {
      projectId,
      audioId,
      language: 'pt-BR',
      force: true,
      provider: 'elevenlabs',
      voice: 'voice-1',
      autoContinue: false,
    });
  });

  it('requires force to regenerate an already completed audio', async () => {
    const { service, queue } = createService({ status: 'DONE' });

    await expect(service.regenerateAudio(userId, projectId, audioId, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(queue.add).not.toHaveBeenCalled();
  });
});
