import { Controller, Delete, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { CurrentUser } from './current-user.decorator';
import type { RequestUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';

@Controller('background-videos')
@UseGuards(JwtAuthGuard)
export class BackgroundVideosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 * 1024 },
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const user = (req as typeof req & { user: RequestUser }).user;
          const destination = join(process.env.STORAGE_PATH || join(process.cwd(), 'storage'), 'background-videos', user.id);
          require('fs').mkdirSync(destination, { recursive: true });
          cb(null, destination);
        },
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
        },
      }),
    }),
  )
  async upload(@CurrentUser() user: RequestUser, @UploadedFile() file: Express.Multer.File) {
    const relativePath = `background-videos/${user.id}/${file.filename}`;
    const durationSeconds = await this.storage.probe(file.path);
    const record = await this.prisma.backgroundVideo.create({
      data: {
        userId: user.id,
        originalName: file.originalname,
        filePath: relativePath,
        durationSeconds,
        sizeBytes: BigInt(file.size),
      },
    });
    return { ...record, sizeBytes: record.sizeBytes.toString() };
  }

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const records = await this.prisma.backgroundVideo.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    return records.map((record) => ({ ...record, sizeBytes: record.sizeBytes.toString() }));
  }

  @Delete(':id')
  async delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const record = await this.prisma.backgroundVideo.findFirst({ where: { id, userId: user.id } });
    if (record) {
      await this.storage.delete(record.filePath);
      await this.prisma.backgroundVideo.delete({ where: { id } });
    }
    return { ok: true };
  }
}
