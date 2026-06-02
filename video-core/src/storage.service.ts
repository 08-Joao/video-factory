import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { dirname, extname, join, normalize } from 'path';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { PrismaService } from './prisma.service';

export type SubtitleCue = {
  start: number;
  end: number;
  text: string;
};

export type VideoRenderOptions = {
  backgroundRelativePath?: string | null;
  backgroundStart?: number;
  subtitlesRelativePath?: string | null;
};

@Injectable()
export class StorageService {
  readonly root = process.env.STORAGE_PATH || join(process.cwd(), 'storage');

  constructor(private readonly prisma: PrismaService) {
    mkdirSync(this.root, { recursive: true });
  }

  cleanName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160);
  }

  absolute(relativePath: string) {
    const fullPath = normalize(join(this.root, relativePath));
    if (!fullPath.startsWith(this.root)) throw new NotFoundException('Caminho inválido');
    return fullPath;
  }

  publicUrl(relativePath: string) {
    return `/files/${relativePath.replace(/^\/+/, '')}`;
  }

  async saveBuffer(buffer: Buffer, relativePath: string) {
    const filePath = this.absolute(relativePath);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return relativePath;
  }

  async saveText(content: string, relativePath: string) {
    return this.saveBuffer(Buffer.from(content), relativePath);
  }

  async delete(relativePath: string) {
    const filePath = this.absolute(relativePath);
    if (existsSync(filePath)) await fs.unlink(filePath);
  }

  async deleteDirectory(relativePath: string) {
    const filePath = this.absolute(relativePath);
    if (existsSync(filePath)) await fs.rm(filePath, { recursive: true, force: true });
  }

  async getRandomBackgroundVideo(userId: string) {
    const records = await this.prisma.backgroundVideo.findMany({ where: { userId } });
    if (!records.length) return null;
    return records[Math.floor(Math.random() * records.length)];
  }

  probe(filePath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (error, data) => {
        if (error) return resolve(0);
        resolve(Number(data.format.duration || 0));
      });
    });
  }

  writeSilentMp3(relativePath: string, seconds: number): Promise<string> {
    const filePath = this.absolute(relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    return this.runFfmpeg([
      '-y',
      '-f', 'lavfi',
      '-i', 'anullsrc=r=44100:cl=mono',
      '-t', String(Math.max(1, seconds)),
      '-c:a', 'libmp3lame',
      filePath,
    ], relativePath);
  }

  concatMp3Files(inputRelativePaths: string[], outputRelativePath: string): Promise<string> {
    const outputPath = this.absolute(outputRelativePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    const listPath = `${outputPath}.concat.txt`;
    const listContent = inputRelativePaths
      .map((relativePath) => `file '${this.absolute(relativePath).replace(/'/g, "'\\''")}'`)
      .join('\n');

    return fs.writeFile(listPath, listContent).then(() => new Promise<string>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f concat', '-safe 0'])
        .audioCodec('copy')
        .output(outputPath)
        .on('end', () => resolve(outputRelativePath))
        .on('error', reject)
        .run();
    })).finally(async () => {
      if (existsSync(listPath)) await fs.unlink(listPath);
    });
  }

  writeFallbackVideo(relativePath: string, seconds: number, vertical = false): Promise<string> {
    const filePath = this.absolute(relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    const size = vertical ? '1080x1920' : '1920x1080';
    return this.runFfmpeg([
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=0x151515:s=${size}:r=30`,
      '-f', 'lavfi',
      '-i', 'anullsrc=r=44100:cl=stereo',
      '-t', String(Math.max(1, seconds)),
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      '-preset', 'ultrafast',
      '-shortest',
      filePath,
    ], relativePath);
  }

  resizeImageToJpeg(inputRelativePath: string, outputRelativePath: string, width: number, height: number): Promise<string> {
    const inputPath = this.absolute(inputRelativePath);
    const outputPath = this.absolute(outputRelativePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          `-vf scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
          '-frames:v 1',
          '-q:v 2',
        ])
        .output(outputPath)
        .on('end', () => resolve(outputRelativePath))
        .on('error', reject)
        .run();
    });
  }

  writeVideoWithAudio(audioRelativePath: string, outputRelativePath: string, seconds: number, vertical = false, start = 0, options: VideoRenderOptions = {}): Promise<string> {
    const outputPath = this.absolute(outputRelativePath);
    const audioPath = this.absolute(audioRelativePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    const size = vertical ? '1080x1920' : '1920x1080';
    const filterSize = vertical ? '1080:1920' : '1920:1080';
    const backgroundPath = options.backgroundRelativePath ? this.absolute(options.backgroundRelativePath) : undefined;
    const subtitlesPath = options.subtitlesRelativePath ? this.absolute(options.subtitlesRelativePath) : undefined;
    const filters = [
      backgroundPath
        ? `scale=${filterSize}:force_original_aspect_ratio=increase,crop=${filterSize},setsar=1`
        : null,
      subtitlesPath ? `subtitles='${this.escapeFilterPath(subtitlesPath)}'` : null,
    ].filter(Boolean).join(',');

    return this.runFfmpeg([
      '-y',
      ...(backgroundPath
        ? ['-stream_loop', '-1', ...(options.backgroundStart ? ['-ss', String(options.backgroundStart)] : []), '-i', backgroundPath]
        : ['-f', 'lavfi', '-i', `color=c=0x151515:s=${size}:r=30`]),
      ...(start > 0 ? ['-ss', String(start)] : []),
      '-i', audioPath,
      '-t', String(Math.max(1, seconds)),
      '-map', '0:v:0',
      '-map', '1:a:0',
      ...(filters ? ['-vf', filters] : []),
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      '-preset', 'ultrafast',
      '-shortest',
      outputPath,
    ], outputRelativePath);
  }

  writeAssSubtitles(relativePath: string, cues: SubtitleCue[], vertical = false, gender: 'male' | 'female' = 'female'): Promise<string> {
    const filePath = this.absolute(relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    const outline = gender === 'male' ? '&H00F8BD38' : '&H008571FB';
    const fontSize = vertical ? 82 : 64;
    const marginV = vertical ? 300 : 110;
    const position = vertical ? '{\\an2\\pos(540,1620)}' : '{\\an2\\pos(960,920)}';
    const content = [
      '[Script Info]',
      'ScriptType: v4.00+',
      'PlayResX: 1080',
      `PlayResY: ${vertical ? 1920 : 1080}`,
      'ScaledBorderAndShadow: yes',
      '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      `Style: Default,Arial Black,${fontSize},&H00FFFFFF,&H00FFFFFF,${outline},&H99000000,-1,0,0,0,100,100,0,0,1,7,1,2,60,60,${marginV},1`,
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
      ...cues.map((cue) => `Dialogue: 0,${this.assTime(cue.start)},${this.assTime(cue.end)},Default,,0,0,0,,${position}${this.escapeAssText(cue.text).toUpperCase()}`),
      '',
    ].join('\n');
    return fs.writeFile(filePath, content).then(() => relativePath);
  }

  captureVideoFrame(videoRelativePath: string, outputRelativePath: string, vertical = false): Promise<string> {
    const inputPath = this.absolute(videoRelativePath);
    const outputPath = this.absolute(outputRelativePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    const size = vertical ? '1080:1920' : '1920:1080';
    return this.runFfmpeg([
      '-y',
      '-ss', '1',
      '-i', inputPath,
      '-vf', `scale=${size}:force_original_aspect_ratio=increase,crop=${size}`,
      '-frames:v', '1',
      '-q:v', '2',
      outputPath,
    ], outputRelativePath);
  }

  private runFfmpeg(args: string[], outputRelativePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('ffmpeg', args);
      const stderr: Buffer[] = [];
      process.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
      process.on('error', reject);
      process.on('close', (code) => {
        if (code === 0) return resolve(outputRelativePath);
        const message = Buffer.concat(stderr).toString('utf8').trim().slice(-4000);
        reject(new Error(`ffmpeg exited with code ${code}${message ? `: ${message}` : ''}`));
      });
    });
  }

  private escapeFilterPath(filePath: string) {
    return filePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
  }

  private assTime(seconds: number) {
    const safe = Math.max(0, seconds);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const wholeSeconds = Math.floor(safe % 60);
    const centiseconds = Math.floor((safe - Math.floor(safe)) * 100);
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  private escapeAssText(text: string) {
    return text.replace(/[{}]/g, '').replace(/\n/g, ' ').trim();
  }

  streamToFile(readable: NodeJS.ReadableStream, relativePath: string): Promise<string> {
    const filePath = this.absolute(relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    return new Promise((resolve, reject) => {
      const stream = createWriteStream(filePath);
      readable.pipe(stream);
      readable.on('error', reject);
      stream.on('finish', () => resolve(relativePath));
      stream.on('error', reject);
    });
  }

  extension(fileName: string) {
    return extname(fileName).toLowerCase() || '.bin';
  }
}
