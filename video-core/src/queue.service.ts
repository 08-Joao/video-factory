import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ProcessingService } from './processing.service';

export type QueueName =
  | 'script-generation'
  | 'translation'
  | 'audio-generation'
  | 'thumbnail'
  | 'video-editing'
  | 'publishing';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private connection!: IORedis;
  private queues = new Map<QueueName, Queue>();
  private workers: Worker[] = [];

  constructor(private readonly processing: ProcessingService) {}

  onModuleInit() {
    this.connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    const names: QueueName[] = [
      'script-generation',
      'translation',
      'audio-generation',
      'thumbnail',
      'video-editing',
      'publishing',
    ];
    for (const name of names) {
      this.queues.set(name, new Queue(name, { connection: this.connection as never }));
      this.workers.push(
        new Worker(
          name,
          async (job) => {
            if (name === 'script-generation') {
              const result = await this.processing.generateScript(job.data.projectId);
              if (result.autoApproved && result.autoRunAfterApproval && job.data.autoContinue !== false) await this.enqueueAfterScript(job.data.projectId);
              return result;
            }
            if (name === 'translation') {
              const result = await this.processing.translateProject(job.data.projectId);
              if (job.data.autoContinue !== false) await this.enqueueAfterTranslation(job.data.projectId);
              return result;
            }
            if (name === 'audio-generation') {
              const result = await this.processing.generateAudio(job.data.projectId, {
                audioId: job.data.audioId,
                language: job.data.language,
                force: job.data.force,
                provider: job.data.provider,
                voice: job.data.voice,
              });
              if (job.data.autoContinue !== false) await this.enqueueAfterAudio(job.data.projectId);
              return result;
            }
            if (name === 'thumbnail') {
              return this.processing.generateThumbnail(job.data.projectId, {
                force: job.data.force,
                provider: job.data.provider,
                style: job.data.style,
              });
            }
            if (name === 'video-editing') return this.processing.generateVideos(job.data.projectId);
            if (name === 'publishing') return this.processing.publish(job.data.projectId, job.data.channelIds, job.data.includeShorts);
          },
          { connection: this.connection as never, concurrency: 2 },
        ),
      );
    }
  }

  async add(name: QueueName, data: Record<string, unknown>) {
    return this.queues.get(name)!.add(name, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }

  async enqueueAfterScript(projectId: string) {
    await this.add('translation', { projectId });
  }

  async enqueueAfterTranslation(projectId: string) {
    await this.add('audio-generation', { projectId });
  }

  async enqueueAfterAudio(projectId: string) {
    await Promise.all([
      this.add('thumbnail', { projectId }),
      this.add('video-editing', { projectId }),
    ]);
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    await this.connection?.quit();
  }
}
