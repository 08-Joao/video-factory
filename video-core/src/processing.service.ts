import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus, PublishJob } from '@prisma/client';
import axios from 'axios';
import OpenAI from 'openai';
import { createReadStream, existsSync } from 'fs';
import { PrismaService } from './prisma.service';
import type { SubtitleCue } from './storage.service';
import { StorageService } from './storage.service';
import { EventsGateway } from './events.gateway';

const SCRIPT_SYSTEM_PROMPT = `Voce e um roteirista profissional especializado em historias virais no estilo Reddit, AITA, TIFU, Relationship Advice, Revenge, Confessions e historias pessoais.

Sua tarefa e criar uma historia COMPLETAMENTE ORIGINAL baseada no tema fornecido pelo usuario.

OBJETIVO:
Criar uma historia extremamente envolvente, emocional e viciante, capaz de prender a atencao do espectador do inicio ao fim em um video narrado para YouTube, TikTok ou Shorts longos.

REGRAS OBRIGATORIAS:
- A historia deve parecer escrita por uma pessoa real.
- NAO pode soar como texto gerado por IA.
- Utilize linguagem natural, humana e espontanea.
- O narrador deve contar os acontecimentos em primeira pessoa.
- Inclua pensamentos, duvidas, insegurancas, arrependimentos e emocoes reais.
- Evite frases genericas ou excessivamente formais.
- A narrativa deve ter detalhes suficientes para parecer uma experiencia verdadeira.

ESTRUTURA:
1. GANCHO INICIAL (HOOK)
Crie uma abertura extremamente forte que desperte curiosidade imediatamente.

2. CONTEXTO
Apresente idade dos envolvidos, relacoes familiares, situacao financeira, ambiente de trabalho, cidade ou contexto social e historico relevante. Tudo deve ser desenvolvido naturalmente.

3. DESENVOLVIMENTO GRADUAL
A tensao deve crescer aos poucos. A cada acontecimento, mostre reacoes emocionais, consequencias, dialogos naturais e conflitos internos. O leitor deve sentir que algo esta errado antes da revelacao principal.

4. PLOT TWIST PRINCIPAL
Insira uma revelacao forte e inesperada, que faca sentido com os eventos anteriores, surpreenda e recontextualize parte da historia.

5. ESCALADA
Apos o plot twist, os problemas devem aumentar. Inclua confrontos, descobertas, discussoes e consequencias reais.

6. CLIMAX
Crie o momento de maior tensao emocional, em que o narrador toma uma decisao importante.

7. DESFECHO
Mostre o resultado dos acontecimentos, o que aconteceu depois, como os envolvidos ficaram e o que mudou.

8. REFLEXAO FINAL
Termine como alguem realmente faria em um post do Reddit, com culpa, duvida, arrependimento ou conviccao.

ELEMENTOS DE RETENCAO:
- Crie pequenos misterios ao longo da narrativa.
- Faca o leitor querer descobrir o proximo acontecimento.
- Utilize cliffhangers entre paragrafos.
- Alterne momentos de tensao e alivio.
- Faca os personagens terem motivacoes realistas.

DIALOGOS:
- Use dialogos ocasionais.
- Devem parecer conversas reais.
- Evite dialogos excessivamente longos.

REALISMO:
- Os personagens devem cometer erros.
- Ninguem deve ser totalmente perfeito.
- As acoes precisam ter consequencias.
- Os acontecimentos devem parecer possiveis na vida real.

TAMANHO:
- MINIMO de 3.500 palavras.
- Preferencialmente entre 4.500 e 6.000 palavras.
- O texto deve ser longo o suficiente para gerar um video narrado de pelo menos 10 a 15 minutos.
- Desenvolva cenas completas. Nao pule semanas ou meses em uma frase quando isso for importante para a emocao da historia.
- Se a historia ficar abaixo de 3.500 palavras, ela esta errada e deve ser expandida antes da resposta final.

PROIBICOES:
- Nao resumir acontecimentos importantes.
- Nao acelerar a historia.
- Nao utilizar listas.
- Nao dividir em capitulos.
- Nao usar titulos, subtitulos, marcadores de estrutura ou headings como "GANCHO", "CONTEXTO", "PLOT TWIST", "CLIMAX", "REFLEXAO FINAL".
- Nao escrever como roteiro.
- Nao mencionar que e uma historia ficticia.
- Nao utilizar linguagem tipica de IA.

IMPORTANTE:
O resultado final deve parecer um relato real encontrado no Reddit que viralizou por ser dramatico, emocional, surpreendente e extremamente envolvente.

FORMATO DE SAIDA:
- Escreva somente a historia em prosa corrida, sem titulos e sem dividir em secoes.
- Depois da historia, escreva exatamente a linha: <META_JSON>
- Na linha seguinte, output um JSON valido com viral_score, viral_reason, summary e narrator_gender ("male" ou "female").
- narrator_gender deve identificar o sexo/genero aparente do AUTOR/NARRADOR da historia em primeira pessoa, nao de outro personagem. Se o autor parecer homem, retorne "male". Se o autor parecer mulher, retorne "female". Essa decisao sera usada para escolher voz masculina ou feminina na narracao.
- Use o TEMA/TITULO como pista principal quando ele definir o papel do narrador. Exemplos:
  - "Minha noiva cancelou o casamento" => narrador provavelmente homem => narrator_gender "male".
  - "Minha esposa me traiu" ou "minha namorada terminou comigo" => narrador provavelmente homem => "male".
  - "Meu noivo cancelou o casamento" ou "meu marido me traiu" => narradora provavelmente mulher => "female".
- Se a historia for em primeira pessoa e mencionar "minha noiva", "minha esposa" ou "minha namorada" como parceira romantica do narrador, prefira "male". Se mencionar "meu noivo", "meu marido" ou "meu namorado" como parceiro romantico, prefira "female".
- Nao escolha o genero pela personagem mais importante; escolha pelo "eu" que esta narrando.
- viral_score deve ser um numero decimal na escala de 0.0 a 1.0. Exemplos validos: 0.78, 0.85, 0.94. Nunca use escala 0 a 10 no JSON; 9.0 esta errado, o correto seria 0.90.
- Nao coloque o JSON dentro de bloco markdown. Nao use crases.`;

type GenerateAudioOptions = {
  audioId?: unknown;
  language?: unknown;
  force?: unknown;
  provider?: unknown;
  voice?: unknown;
};

type GenerateThumbnailOptions = {
  force?: unknown;
  provider?: unknown;
  style?: unknown;
};

@Injectable()
export class ProcessingService {
  private openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventsGateway,
  ) {}

  private async project(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { user: { include: { settings: true } }, script: true, translations: true, audioFiles: true, thumbnail: true, videoFiles: true },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    return project;
  }

  private emit(userId: string, projectId: string, status: ProjectStatus, step: string, progress: number, message: string) {
    this.events.progress(userId, { projectId, status, step, progress, message });
  }

  async generateScript(projectId: string) {
    const project = await this.project(projectId);
    this.emit(project.userId, projectId, 'PENDING_SCRIPT', 'script', 10, 'Gerando roteiro');

    const fallback = this.localScript(project.theme);
    let content = fallback.content;
    let viralScore = fallback.viralScore;
    let viralReason = fallback.viralReason;
    let summary = fallback.summary;
    let narratorGender = fallback.narratorGender;

    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SCRIPT_SYSTEM_PROMPT },
            { role: 'user', content: `TEMA:\n${project.theme}\n\nOBSERVACOES ADICIONAIS:\n${project.suggestion || ''}` },
          ],
          temperature: 0.9,
          max_tokens: 12000,
        });
        const parsed = this.parseScript(response.choices[0]?.message?.content || '');
        content = parsed.content || content;
        viralScore = parsed.viralScore || viralScore;
        viralReason = parsed.viralReason || viralReason;
        summary = parsed.summary || summary;
        narratorGender = this.inferNarratorGender(project.theme, content, parsed.narratorGender || narratorGender);
        if (this.wordCount(content) < 3200) {
          const expanded = await this.expandScript(content, project.theme);
          const expandedParsed = this.parseScript(expanded);
          content = expandedParsed.content || expanded || content;
          viralScore = expandedParsed.viralScore || viralScore;
          viralReason = expandedParsed.viralReason || viralReason;
          summary = expandedParsed.summary || summary;
          narratorGender = this.inferNarratorGender(project.theme, content, expandedParsed.narratorGender || narratorGender);
        }
      } catch (error) {
        console.warn('OpenAI script fallback:', error);
      }
    }
    narratorGender = this.inferNarratorGender(project.theme, content, narratorGender);

    await this.prisma.script.upsert({
      where: { projectId },
      create: { projectId, content, summary, viralScore, viralReason, narratorGender },
      update: { content, summary, viralScore, viralReason, narratorGender },
    });
    await this.prisma.project.update({
      where: { id: projectId },
      data: { viralScore, status: 'SCRIPT_GENERATED' },
    });
    this.emit(project.userId, projectId, 'SCRIPT_GENERATED', 'script', 100, 'Roteiro pronto para revisao');
    return { autoApproved: false, autoRunAfterApproval: false };
  }

  async translateProject(projectId: string) {
    const project = await this.project(projectId);
    if (!project.script) throw new NotFoundException('Roteiro ausente');
    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'TRANSLATING' } });
    this.emit(project.userId, projectId, 'TRANSLATING', 'translation', 15, 'Traduzindo idiomas');

    const languages = project.user.settings?.defaultLanguages?.length ? project.user.settings.defaultLanguages : ['pt-BR', 'en-US', 'es-ES'];
    for (const language of languages) {
      const content = language === project.script.language ? project.script.content : await this.translate(project.script.content, language);
      await this.prisma.translation.upsert({
        where: { projectId_language: { projectId, language } },
        create: { projectId, language, content, summary: project.script.summary, status: 'DONE' },
        update: { content, summary: project.script.summary, status: 'DONE' },
      });
    }
    this.emit(project.userId, projectId, 'TRANSLATING', 'translation', 100, 'Traduções concluídas');
    return { languages };
  }

  async generateAudio(projectId: string, options: GenerateAudioOptions = {}) {
    const project = await this.project(projectId);
    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'AUDIO_GENERATING' } });
    this.emit(project.userId, projectId, 'AUDIO_GENERATING', 'audio', 10, 'Gerando narrações');
    const targetLanguage = typeof options.language === 'string' ? options.language : undefined;
    const provider = typeof options.provider === 'string' ? options.provider : 'elevenlabs';
    const forcedVoice = typeof options.voice === 'string' ? options.voice : undefined;
    const force = options.force === true || options.force === 'true';
    const translations = await this.prisma.translation.findMany({
      where: { projectId, status: 'DONE', ...(targetLanguage ? { language: targetLanguage } : {}) },
    });
    if (!translations.length) throw new NotFoundException('Traduções ausentes');
    const failures: string[] = [];

    for (const translation of translations) {
      const existing = await this.prisma.audioFile.findUnique({
        where: { projectId_language: { projectId, language: translation.language } },
      });
      const audioModel = provider === 'openai' ? process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts' : 'eleven_multilingual_v2';
      const narratorGender = this.inferNarratorGender(project.theme, project.script?.content || translation.content, project.script?.narratorGender);
      if (project.script && project.script.narratorGender !== narratorGender) {
        await this.prisma.script.update({ where: { projectId }, data: { narratorGender } });
      }
      const voiceId = provider === 'openai'
        ? forcedVoice || process.env.OPENAI_TTS_VOICE || 'alloy'
        : forcedVoice || this.voiceFor(translation.language, narratorGender, project.user.settings?.defaultVoiceId);
      const attempt = (existing?.attempt || 0) + 1;
      const relativePath = force
        ? `projects/${projectId}/audio/${translation.language}-${Date.now()}.mp3`
        : existing?.filePath || `projects/${projectId}/audio/${translation.language}.mp3`;
      let duration = Math.max(60, Math.min(900, Math.round(translation.content.split(/\s+/).length / 2.4)));
      try {
        if (existing?.status === 'DONE' && existsSync(this.storage.absolute(existing.filePath)) && !force) continue;

        const pendingAudio = await this.prisma.audioFile.upsert({
          where: { projectId_language: { projectId, language: translation.language } },
          create: {
            projectId,
            translationId: translation.id,
            language: translation.language,
            filePath: relativePath,
            elevenLabsVoiceId: voiceId,
            provider,
            model: audioModel,
            voice: voiceId,
            attempt,
            status: 'GENERATING',
          },
          update: {
            translationId: translation.id,
            filePath: relativePath,
            elevenLabsVoiceId: voiceId,
            provider,
            model: audioModel,
            voice: voiceId,
            attempt,
            status: 'GENERATING',
            errorMessage: null,
            errorStack: null,
          },
        });
        await this.logProcessing({
          projectId,
          entityType: 'AudioFile',
          entityId: pendingAudio.id,
          action: 'audio_generation',
          status: 'GENERATING',
          message: `Gerando áudio ${translation.language}`,
          provider,
          model: audioModel,
          voice: voiceId,
          attempt,
          metadataJson: { language: translation.language, force, audioId: options.audioId },
        });

        if (provider === 'openai') {
          await this.generateOpenAIAudio(translation.content, voiceId, audioModel, translation.language, projectId, relativePath);
          duration = await this.storage.probe(this.storage.absolute(relativePath));
        } else if (process.env.ELEVEN_LABS_API_KEY) {
          await this.generateElevenLabsAudio(translation.content, voiceId, translation.language, projectId, relativePath);
          duration = await this.storage.probe(this.storage.absolute(relativePath));
        } else {
          await this.storage.writeSilentMp3(relativePath, duration);
        }
        await this.prisma.audioFile.upsert({
          where: { projectId_language: { projectId, language: translation.language } },
          create: { projectId, translationId: translation.id, language: translation.language, filePath: relativePath, durationSeconds: duration, elevenLabsVoiceId: voiceId, provider, model: audioModel, voice: voiceId, attempt, status: 'DONE' },
          update: { filePath: relativePath, durationSeconds: duration, elevenLabsVoiceId: voiceId, provider, model: audioModel, voice: voiceId, attempt, errorMessage: null, errorStack: null, status: 'DONE' },
        });
        await this.logProcessing({
          projectId,
          entityType: 'AudioFile',
          entityId: pendingAudio.id,
          action: 'audio_generation',
          status: 'DONE',
          message: `Áudio ${translation.language} pronto`,
          provider,
          model: audioModel,
          voice: voiceId,
          attempt,
          metadataJson: { language: translation.language, durationSeconds: duration, filePath: relativePath },
        });
      } catch (error) {
        const details = this.errorDetails(error);
        console.error('ElevenLabs audio error:', {
          projectId,
          language: translation.language,
          voiceId,
          error: details.message,
        });
        failures.push(translation.language);
        const failedAudio = await this.prisma.audioFile.upsert({
          where: { projectId_language: { projectId, language: translation.language } },
          create: { projectId, translationId: translation.id, language: translation.language, filePath: relativePath, elevenLabsVoiceId: voiceId, provider, model: audioModel, voice: voiceId, attempt, errorMessage: details.message, errorStack: details.stack, status: 'FAILED' },
          update: { translationId: translation.id, filePath: relativePath, durationSeconds: null, elevenLabsVoiceId: voiceId, provider, model: audioModel, voice: voiceId, attempt, errorMessage: details.message, errorStack: details.stack, status: 'FAILED' },
        });
        await this.logProcessing({
          projectId,
          entityType: 'AudioFile',
          entityId: failedAudio.id,
          action: 'audio_generation',
          status: 'FAILED',
          message: `Falha ao gerar áudio ${translation.language}`,
          errorMessage: details.message,
          errorStack: details.stack,
          provider,
          model: audioModel,
          voice: voiceId,
          attempt,
          metadataJson: { language: translation.language, requestId: details.requestId, response: details.safeResponse },
        });
      }
    }
    if (failures.length) {
      await this.prisma.project.update({ where: { id: projectId }, data: { status: 'FAILED' } });
      this.emit(project.userId, projectId, 'FAILED', 'audio', 100, `Falha ao gerar áudio: ${failures.join(', ')}`);
      throw new Error(`Falha ao gerar áudio: ${failures.join(', ')}`);
    }
    this.emit(project.userId, projectId, 'AUDIO_GENERATING', 'audio', 100, 'Áudios prontos');
    return { count: translations.length };
  }

  async generateThumbnail(projectId: string, options: GenerateThumbnailOptions = {}) {
    const project = await this.project(projectId);
    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'THUMBNAIL_GENERATING' } });
    const summary = project.script?.summary || project.theme;
    const provider = typeof options.provider === 'string' ? options.provider : process.env.IMAGE_PROVIDER || 'openai';
    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
    const style = typeof options.style === 'string' ? options.style : process.env.THUMBNAIL_STYLE || 'cartoon';
    const width = Number(process.env.THUMBNAIL_WIDTH || 1280);
    const height = Number(process.env.THUMBNAIL_HEIGHT || 720);
    const prompt = this.thumbnailPrompt(summary, style);
    const rawPath = `projects/${projectId}/thumbnail-source-${Date.now()}.png`;
    const relativePath = `projects/${projectId}/thumbnail.jpg`;
    this.emit(project.userId, projectId, 'THUMBNAIL_GENERATING', 'thumbnail', 20, 'Gerando thumbnail');

    try {
      if (provider !== 'openai') throw new Error(`IMAGE_PROVIDER ${provider} nao suportado`);
      if (!this.openai) throw new Error('OPENAI_API_KEY ausente para gerar thumbnail');
      await this.logProcessing({
        projectId,
        entityType: 'Thumbnail',
        entityId: project.thumbnail?.id || projectId,
        action: 'thumbnail_generation',
        status: 'GENERATING',
        message: 'Gerando thumbnail base sem texto',
        provider,
        model,
        metadataJson: { style, width, height },
      });
      const image = await this.openai.images.generate(this.openAIImagePayload(model, prompt));
      const buffer = await this.imageBuffer(image);
      await this.storage.saveBuffer(buffer, rawPath);
      await this.storage.resizeImageToJpeg(rawPath, relativePath, width, height);
      await this.storage.delete(rawPath);
      if (!existsSync(this.storage.absolute(relativePath))) throw new Error('thumbnail path');
      const thumbnail = await this.prisma.thumbnail.upsert({
        where: { projectId },
        create: { projectId, filePath: relativePath, prompt, provider, model, style, width, height, generatedAt: new Date(), status: 'DONE' },
        update: { filePath: relativePath, prompt, provider, model, style, width, height, generatedAt: new Date(), errorMessage: null, metadataJson: this.safeJson({ revisedPrompt: image.data?.[0]?.revised_prompt }), status: 'DONE' },
      });
      await this.logProcessing({
        projectId,
        entityType: 'Thumbnail',
        entityId: thumbnail.id,
        action: 'thumbnail_generation',
        status: 'DONE',
        message: 'Thumbnail base pronta',
        provider,
        model,
        metadataJson: { style, width, height, filePath: relativePath },
      });
      this.emit(project.userId, projectId, 'THUMBNAIL_GENERATING', 'thumbnail', 100, 'Thumbnail DALL-e pronta');
    } catch (error) {
      const details = this.errorDetails(error);
      console.error('OpenAI thumbnail error:', details.message);
      const thumbnail = await this.prisma.thumbnail.upsert({
        where: { projectId },
        create: { projectId, filePath: relativePath, prompt, provider, model, style, width, height, errorMessage: details.message, metadataJson: this.safeJson({ requestId: details.requestId, response: details.safeResponse }), status: 'FAILED' },
        update: { prompt, provider, model, style, width, height, errorMessage: details.message, metadataJson: this.safeJson({ requestId: details.requestId, response: details.safeResponse }), status: 'FAILED' },
      });
      await this.logProcessing({
        projectId,
        entityType: 'Thumbnail',
        entityId: thumbnail.id,
        action: 'thumbnail_generation',
        status: 'FAILED',
        message: 'Falha ao gerar thumbnail',
        errorMessage: details.message,
        errorStack: details.stack,
        provider,
        model,
        metadataJson: { style, width, height, requestId: details.requestId, response: details.safeResponse },
      });
      await this.prisma.project.update({ where: { id: projectId }, data: { status: 'FAILED' } });
      this.emit(project.userId, projectId, 'FAILED', 'thumbnail', 100, 'Falha ao gerar thumbnail');
      throw error;
      }
  }

  async generateVideos(projectId: string) {
    const project = await this.project(projectId);
    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'VIDEO_EDITING' } });
    const audioFiles = await this.prisma.audioFile.findMany({ where: { projectId, status: 'DONE' } });
    this.emit(project.userId, projectId, 'VIDEO_EDITING', 'video', 10, 'Editando vídeos');

    try {
      if (!audioFiles.length) throw new NotFoundException('Nenhum áudio pronto para gerar vídeos');

      for (const audio of audioFiles) {
        const duration = Math.max(10, Math.round(audio.durationSeconds || 60));
        const longPath = `projects/${projectId}/videos/${audio.language}_long.mp4`;
        await this.logProcessing({
          projectId,
          entityType: 'VideoFile',
          entityId: longPath,
          action: 'video_editing',
          status: 'EDITING',
          message: `Gerando vídeo longo ${audio.language}`,
          metadataJson: { language: audio.language, type: 'LONG', durationSeconds: duration, audioId: audio.id, audioPath: audio.filePath },
        });
        const narratorGender = this.inferNarratorGender(project.theme, project.script?.content || '', project.script?.narratorGender);
        const subtitleCues = await this.subtitleCues(projectId, audio, narratorGender);
        const longSubtitles = await this.writeSubtitlesForVideo(projectId, audio.language, 'long', subtitleCues, 0, duration, false, narratorGender);
        await this.renderVideo(project.userId, audio.filePath, longPath, duration, false, 0, longSubtitles);
        await this.storage.captureVideoFrame(longPath, this.posterPath(longPath), false);
        await this.prisma.videoFile.deleteMany({ where: { projectId, language: audio.language, type: 'LONG' } });
        const longVideo = await this.prisma.videoFile.create({
          data: { projectId, language: audio.language, type: 'LONG', partNumber: 0, filePath: longPath, durationSeconds: duration, status: 'DONE' },
        });
        await this.logProcessing({
          projectId,
          entityType: 'VideoFile',
          entityId: longVideo.id,
          action: 'video_editing',
          status: 'DONE',
          message: `Vídeo longo ${audio.language} pronto`,
          metadataJson: { language: audio.language, type: 'LONG', durationSeconds: duration, filePath: longPath },
        });

        const parts = Math.min(3, Math.max(1, Math.ceil(duration / 60)));
        await this.prisma.videoFile.deleteMany({ where: { projectId, language: audio.language, type: 'SHORT' } });
        for (let part = 1; part <= parts; part++) {
          const shortPath = `projects/${projectId}/videos/${audio.language}_short_part_${part}.mp4`;
          const shortDuration = Math.min(60, duration);
          await this.logProcessing({
            projectId,
            entityType: 'VideoFile',
            entityId: shortPath,
            action: 'video_editing',
            status: 'EDITING',
            message: `Gerando short ${audio.language} parte ${part}`,
            metadataJson: { language: audio.language, type: 'SHORT', partNumber: part, durationSeconds: shortDuration, audioId: audio.id, audioPath: audio.filePath },
          });
          const offset = (part - 1) * 60;
          const shortSubtitles = await this.writeSubtitlesForVideo(projectId, audio.language, `short_part_${part}`, subtitleCues, offset, shortDuration, true, narratorGender);
          await this.renderVideo(project.userId, audio.filePath, shortPath, shortDuration, true, offset, shortSubtitles);
          await this.storage.captureVideoFrame(shortPath, this.posterPath(shortPath), true);
          const shortVideo = await this.prisma.videoFile.create({
            data: { projectId, language: audio.language, type: 'SHORT', partNumber: part, filePath: shortPath, durationSeconds: shortDuration, status: 'DONE' },
          });
          await this.logProcessing({
            projectId,
            entityType: 'VideoFile',
            entityId: shortVideo.id,
            action: 'video_editing',
            status: 'DONE',
            message: `Short ${audio.language} parte ${part} pronto`,
            metadataJson: { language: audio.language, type: 'SHORT', partNumber: part, durationSeconds: shortDuration, filePath: shortPath },
          });
        }
      }

      await this.prisma.project.update({ where: { id: projectId }, data: { status: 'READY_TO_PUBLISH' } });
      this.emit(project.userId, projectId, 'READY_TO_PUBLISH', 'video', 100, 'Vídeos prontos para publicar');
      return { count: audioFiles.length };
    } catch (error) {
      const details = this.errorDetails(error);
      console.error('Video editing error:', { projectId, error: details.message });
      await this.logProcessing({
        projectId,
        entityType: 'Project',
        entityId: projectId,
        action: 'video_editing',
        status: 'FAILED',
        message: 'Falha ao gerar vídeos',
        errorMessage: details.message,
        errorStack: details.stack,
        metadataJson: { response: details.safeResponse },
      });
      await this.prisma.project.update({ where: { id: projectId }, data: { status: 'FAILED' } });
      this.emit(project.userId, projectId, 'FAILED', 'video', 100, 'Falha ao gerar vídeos');
      throw error;
    }
  }

  async publish(projectId: string, channelIds: string[], includeShorts = true) {
    const project = await this.project(projectId);
    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'PUBLISHING' } });
    const channels = await this.prisma.channel.findMany({ where: { id: { in: channelIds }, userId: project.userId, isActive: true } });
    const jobs: PublishJob[] = [];
    for (const channel of channels) {
      const videos = await this.prisma.videoFile.findMany({
        where: { projectId, language: channel.language, type: includeShorts && channel.platform === 'TIKTOK' ? 'SHORT' : undefined },
        orderBy: [{ type: 'asc' }, { partNumber: 'asc' }],
        take: includeShorts ? 3 : 1,
      });
      for (const video of videos) {
        jobs.push(
          await this.prisma.publishJob.create({
            data: {
              projectId,
              channelId: channel.id,
              videoFileId: video.id,
              status: 'PUBLISHED',
              youtubeVideoId: channel.platform === 'YOUTUBE' ? `simulated-${video.id}` : null,
              tiktokVideoId: channel.platform === 'TIKTOK' ? `simulated-${video.id}` : null,
              publishedAt: new Date(),
            },
          }),
        );
      }
    }
    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'PUBLISHED' } });
    this.emit(project.userId, projectId, 'PUBLISHED', 'publishing', 100, 'Publicação concluída');
    return { jobs };
  }

  private parseScript(raw: string) {
    const cleaned = raw.trim();
    const metaBlock = cleaned.match(/<META_JSON>\s*(```(?:json)?\s*)?(\{[\s\S]*?\})\s*```?\s*$/i);
    const fencedBlock = cleaned.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```\s*$/i);
    const plainBlock = cleaned.match(/(\{[\s\S]*\})\s*$/);
    const jsonText = metaBlock?.[2] || fencedBlock?.[1] || plainBlock?.[1] || '';
    const jsonStart = jsonText ? cleaned.lastIndexOf(jsonText) : -1;
    const content = this.cleanStoryContent(jsonStart >= 0 ? cleaned.slice(0, jsonStart) : cleaned);
    try {
      const meta = jsonText ? JSON.parse(jsonText) : {};
      return {
        content,
        viralScore: this.normalizeViralScore(meta.viral_score),
        viralReason: String(meta.viral_reason || 'História com conflito emocional e curiosidade.'),
        summary: String(meta.summary || content.slice(0, 240)),
        narratorGender: this.normalizeGender(meta.narrator_gender),
      };
    } catch {
      return { content, viralScore: 7, viralReason: 'História com tensão narrativa.', summary: content.slice(0, 240), narratorGender: 'female' };
    }
  }

  private async expandScript(content: string, theme: string) {
    if (!this.openai) return content;
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: `${SCRIPT_SYSTEM_PROMPT}\n\nA historia recebida ficou curta. Reescreva e expanda para no minimo 3.500 palavras, mantendo a mesma premissa, sem titulos, sem secoes e sem markdown.` },
        { role: 'user', content: `TEMA:\n${theme}\n\nHISTORIA CURTA PARA EXPANDIR:\n${content}` },
      ],
      temperature: 0.85,
      max_tokens: 12000,
    });
    return response.choices[0]?.message?.content || content;
  }

  private cleanStoryContent(content: string) {
    return content
      .replace(/<META_JSON>\s*$/i, '')
      .replace(/```(?:json)?\s*$/i, '')
      .split('\n')
      .filter((line) => !/^\s*\*\*?\s*(GANCHO|CONTEXTO|DESENVOLVIMENTO|PLOT TWIST|ESCALADA|CL[IÍ]MAX|DESFECHO|REFLEX[AÃ]O FINAL)[^*\n]*\*\*?\s*:?\s*$/i.test(line))
      .join('\n')
      .trim();
  }

  private wordCount(content: string) {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }

  private normalizeViralScore(value: unknown) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return 7;
    const normalized = raw > 0 && raw <= 1 ? raw * 10 : raw;
    return Math.max(0, Math.min(10, Number(normalized.toFixed(1))));
  }

  private localScript(theme: string) {
    const content = `Eu achei que estava exagerando quando comecei a desconfiar de tudo. Sério. O tema era ${theme}, e no começo parecia só mais uma daquelas situações pequenas que você engole para manter a paz.

Mas aí uma coisa virou duas, duas viraram dez, e de repente eu estava sentado no chão da cozinha às duas da manhã olhando para mensagens antigas e pensando: espera, isso sempre esteve aqui?

O pior é que ninguém acredita quando você conta do começo. Parece drama. Parece que você está procurando problema. Só que tem um momento em que o corpo entende antes da cabeça. Você entra numa sala e sente que todo mundo parou de falar um segundo antes. Você pergunta algo simples e a resposta vem ensaiada demais. E pronto. Acabou. Você não consegue mais desver.

Eu tentei agir normal por uma semana. Falhei miseravelmente. Dormia pouco, respondia seco, fingia rir. Até que encontrei o detalhe que não combinava com nenhuma versão da história. Um recibo. Um nome. Um horário impossível.

E quando finalmente perguntei, a pessoa não negou. Só disse: "Eu estava esperando você perceber."

Foi aí que eu entendi que aquilo não tinha começado naquele dia. Tinha começado muito antes. E, honestamente, acho que a próxima parte é a que ainda vai acabar comigo.`;
    return {
      content,
      viralScore: 7.4,
      viralReason: 'Conflito pessoal, mistério crescente e final em cliffhanger.',
      summary: `Uma história emocional sobre desconfiança, sinais ignorados e uma revelação ligada a ${theme}.`,
      narratorGender: 'female',
    };
  }

  private async translate(content: string, language: string) {
    if (!this.openai) return `[${language}]\n${content}`;
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `Translate the following Reddit-style story to ${language}. Preserve informal tone. Output ONLY the translated text.` },
          { role: 'user', content },
        ],
        temperature: 0.5,
      });
      return response.choices[0]?.message?.content || `[${language}]\n${content}`;
    } catch {
      return `[${language}]\n${content}`;
    }
  }

  private async generateElevenLabsAudio(content: string, voiceId: string, language: string, projectId: string, outputRelativePath: string) {
    const chunks = this.splitForTts(content);
    const partPaths: string[] = [];

    for (let index = 0; index < chunks.length; index++) {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: chunks[index],
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            speed: language === 'pt-BR' ? 1.12 : 1,
          },
        },
        { headers: { 'xi-api-key': process.env.ELEVEN_LABS_API_KEY }, responseType: 'arraybuffer', timeout: 180000 },
      );
      const partPath = chunks.length === 1 ? outputRelativePath : `projects/${projectId}/audio/.tmp/${language}-${index + 1}.mp3`;
      await this.storage.saveBuffer(Buffer.from(response.data), partPath);
      partPaths.push(partPath);
    }

    if (partPaths.length > 1) {
      await this.storage.concatMp3Files(partPaths, outputRelativePath);
      await Promise.all(partPaths.map((partPath) => this.storage.delete(partPath)));
    }
  }

  private async generateOpenAIAudio(content: string, voice: string, model: string, language: string, projectId: string, outputRelativePath: string) {
    if (!this.openai) throw new Error('OPENAI_API_KEY ausente para gerar áudio OpenAI');
    const chunks = this.splitForTts(content, 3800);
    const partPaths: string[] = [];

    for (let index = 0; index < chunks.length; index++) {
      const speech = await this.openai.audio.speech.create({
        model,
        voice: voice as never,
        input: chunks[index],
        instructions: this.openAITtsInstructions(language),
        response_format: 'mp3',
      });
      const partPath = chunks.length === 1 ? outputRelativePath : `projects/${projectId}/audio/.tmp/openai-${language}-${index + 1}.mp3`;
      await this.storage.saveBuffer(Buffer.from(await speech.arrayBuffer()), partPath);
      partPaths.push(partPath);
    }

    if (partPaths.length > 1) {
      await this.storage.concatMp3Files(partPaths, outputRelativePath);
      await Promise.all(partPaths.map((partPath) => this.storage.delete(partPath)));
    }
  }

  private openAITtsInstructions(language: string) {
    if (language.toLowerCase().startsWith('pt')) return 'Narrate in Brazilian Portuguese with natural pacing, emotional clarity, and a conversational storytelling tone.';
    if (language.toLowerCase().startsWith('es')) return 'Narrate in Spanish with natural pacing, emotional clarity, and a conversational storytelling tone.';
    return 'Narrate in English with natural pacing, emotional clarity, and a conversational storytelling tone.';
  }

  private splitForTts(content: string, maxChars = 4200) {
    const paragraphs = content.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
    const chunks: string[] = [];
    let current = '';

    const push = (text: string) => {
      if (current && `${current}\n\n${text}`.length > maxChars) {
        chunks.push(current);
        current = text;
      } else {
        current = current ? `${current}\n\n${text}` : text;
      }
    };

    for (const paragraph of paragraphs.length ? paragraphs : [content]) {
      if (paragraph.length <= maxChars) {
        push(paragraph);
        continue;
      }
      const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
      for (const sentence of sentences.map((item) => item.trim()).filter(Boolean)) {
        if (sentence.length <= maxChars) {
          push(sentence);
          continue;
        }
        for (let index = 0; index < sentence.length; index += maxChars) {
          push(sentence.slice(index, index + maxChars));
        }
      }
    }

    if (current) chunks.push(current);
    return chunks;
  }

  private async subtitleCues(projectId: string, audio: { filePath: string; language: string; durationSeconds?: number | null; translationId?: string | null }, gender: 'male' | 'female'): Promise<SubtitleCue[]> {
    const audioPath = this.storage.absolute(audio.filePath);
    if (this.openai && existsSync(audioPath)) {
      try {
        const transcription = await this.openai.audio.transcriptions.create({
          file: createReadStream(audioPath) as never,
          model: 'whisper-1',
          response_format: 'verbose_json',
          timestamp_granularities: ['word'],
          language: this.isoLanguage(audio.language),
        } as never) as { words?: Array<{ word?: string; start?: number; end?: number }> };
        const words = (transcription.words || [])
          .map((word) => ({ text: String(word.word || '').trim(), start: Number(word.start), end: Number(word.end) }))
          .filter((word) => word.text && Number.isFinite(word.start) && Number.isFinite(word.end));
        if (words.length) return this.groupSubtitleWords(words);
      } catch (error) {
        const details = this.errorDetails(error);
        await this.logProcessing({
          projectId,
          entityType: 'AudioFile',
          entityId: audio.filePath,
          action: 'subtitle_generation',
          status: 'FAILED',
          message: `Falha ao transcrever legendas ${audio.language}; usando estimativa local`,
          errorMessage: details.message,
          errorStack: details.stack,
          provider: 'openai',
          model: 'whisper-1',
          metadataJson: { language: audio.language, gender },
        });
      }
    }

    const translation = audio.translationId
      ? await this.prisma.translation.findUnique({ where: { id: audio.translationId } })
      : await this.prisma.translation.findFirst({ where: { projectId, language: audio.language } });
    return this.estimatedSubtitleCues(translation?.content || '', Number(audio.durationSeconds || 60));
  }

  private groupSubtitleWords(words: Array<{ text: string; start: number; end: number }>): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    for (let index = 0; index < words.length; index += 2) {
      const group = words.slice(index, index + 2);
      cues.push({
        start: group[0].start,
        end: Math.max(group[group.length - 1].end, group[0].start + 0.35),
        text: group.map((word) => word.text).join(' '),
      });
    }
    return cues;
  }

  private estimatedSubtitleCues(content: string, duration: number): SubtitleCue[] {
    const words = content.split(/\s+/).map((word) => word.trim()).filter(Boolean);
    if (!words.length) return [];
    const secondsPerWord = Math.max(0.18, duration / words.length);
    const cues: SubtitleCue[] = [];
    for (let index = 0; index < words.length; index += 2) {
      const group = words.slice(index, index + 2);
      cues.push({
        start: index * secondsPerWord,
        end: Math.min(duration, (index + group.length) * secondsPerWord),
        text: group.join(' '),
      });
    }
    return cues;
  }

  private async writeSubtitlesForVideo(projectId: string, language: string, name: string, cues: SubtitleCue[], offset: number, duration: number, vertical: boolean, gender: 'male' | 'female') {
    const scopedCues = cues
      .filter((cue) => cue.end > offset && cue.start < offset + duration)
      .map((cue) => ({
        start: Math.max(0, cue.start - offset),
        end: Math.min(duration, Math.max(0.25, cue.end - offset)),
        text: cue.text,
      }))
      .filter((cue) => cue.end > cue.start);
    if (!scopedCues.length) return undefined;
    const relativePath = `projects/${projectId}/subtitles/${language}_${name}.ass`;
    return this.storage.writeAssSubtitles(relativePath, scopedCues, vertical, gender);
  }

  private posterPath(videoPath: string) {
    return videoPath.replace(/\.mp4$/i, '.jpg');
  }

  private isoLanguage(language: string) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith('pt')) return 'pt';
    if (normalized.startsWith('es')) return 'es';
    if (normalized.startsWith('en')) return 'en';
    return undefined;
  }

  private async renderVideo(userId: string, audioRelative: string, outputRelative: string, duration: number, vertical: boolean, start = 0, subtitlesRelativePath?: string) {
    const background = await this.storage.getRandomBackgroundVideo(userId);
    const usableBackground = background && existsSync(this.storage.absolute(background.filePath)) ? background : null;
    const backgroundStart = usableBackground?.durationSeconds && usableBackground.durationSeconds > duration
      ? Math.floor(Math.random() * Math.max(1, usableBackground.durationSeconds - duration))
      : 0;
    return this.storage.writeVideoWithAudio(audioRelative, outputRelative, duration, vertical, start, {
      backgroundRelativePath: usableBackground?.filePath,
      backgroundStart,
      subtitlesRelativePath,
    });
  }

  private normalizeGender(value: unknown): 'male' | 'female' {
    return String(value || '').toLowerCase().includes('male') && !String(value || '').toLowerCase().includes('female') ? 'male' : 'female';
  }

  private inferNarratorGender(theme: string, content: string, modelGender?: string): 'male' | 'female' {
    const text = `${theme}\n${content.slice(0, 3000)}`.toLowerCase();
    const maleSignals = [
      /\bminha\s+(noiva|esposa|namorada)\b/,
      /\ba\s+minha\s+(noiva|esposa|namorada)\b/,
      /\bminha\s+mulher\b/,
    ];
    const femaleSignals = [
      /\bmeu\s+(noivo|marido|namorado)\b/,
      /\bo\s+meu\s+(noivo|marido|namorado)\b/,
    ];
    if (maleSignals.some((pattern) => pattern.test(text))) return 'male';
    if (femaleSignals.some((pattern) => pattern.test(text))) return 'female';
    return this.normalizeGender(modelGender);
  }

  private voiceFor(language: string, gender?: string, defaultVoiceId?: string) {
    const languageKey = this.voiceLanguageKey(language);
    const genderKey = gender === 'male' ? 'MALE' : 'FEMALE';
    const languageVoiceId = process.env[`${genderKey}_${languageKey}_VOICE_ID`];

    if (languageVoiceId) return languageVoiceId;
    if (gender === 'male') return process.env.ELEVEN_LABS_MALE_VOICE_ID || process.env.ELEVEN_LABS_DEFAULT_MALE_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
    return process.env.ELEVEN_LABS_FEMALE_VOICE_ID || defaultVoiceId || process.env.ELEVEN_LABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  }

  private voiceLanguageKey(language: string) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith('pt')) return 'PT';
    if (normalized.startsWith('es')) return 'ES';
    return 'EN';
  }

  private thumbnailPrompt(summary: string, style: string) {
    return `Create a cartoon-style YouTube thumbnail illustration inspired by this story.

Important rules:
- No text.
- No letters.
- No words.
- No captions.
- No logos.
- No watermark.
- Do not include readable signs, labels, UI, documents, phones with text, posters, subtitles, or symbols that look like writing.
- 16:9 landscape composition.
- High contrast.
- Dramatic facial expression.
- Clear emotional conflict.
- One strong focal point.
- Expressive characters.
- Colorful, polished, viral YouTube thumbnail style.
- Cinematic lighting and strong foreground/background separation.

Style: ${style || 'cartoon'}.

Story context:
${summary}`.slice(0, 3900);
  }

  private openAIImagePayload(model: string, prompt: string) {
    const isDalle3 = model === 'dall-e-3';
    const payload: Record<string, unknown> = {
      model,
      prompt,
      n: 1,
      size: isDalle3 ? '1792x1024' : '1536x1024',
    };
    if (isDalle3) {
      payload.quality = 'hd';
      payload.style = 'vivid';
      payload.response_format = 'b64_json';
    } else {
      payload.quality = process.env.OPENAI_IMAGE_QUALITY || 'medium';
      payload.output_format = 'png';
    }
    return payload as never;
  }

  private async imageBuffer(image: unknown) {
    const first = (image as { data?: Array<{ b64_json?: string; url?: string }> }).data?.[0];
    if (first?.b64_json) return Buffer.from(first.b64_json, 'base64');
    if (first?.url) {
      const response = await axios.get(first.url, { responseType: 'arraybuffer', timeout: 120000 });
      return Buffer.from(response.data);
    }
    throw new Error('OpenAI Images API nao retornou imagem');
  }

  private async logProcessing(input: {
    projectId?: string;
    entityType: string;
    entityId: string;
    action: string;
    status: string;
    message?: string;
    errorMessage?: string;
    errorStack?: string;
    provider?: string;
    model?: string | null;
    voice?: string;
    attempt?: number;
    metadataJson?: unknown;
  }) {
    await this.prisma.processingLog.create({
      data: {
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        status: input.status,
        message: input.message,
        errorMessage: input.errorMessage,
        errorStack: input.errorStack,
        provider: input.provider,
        model: input.model || undefined,
        voice: input.voice,
        attempt: input.attempt,
        metadataJson: this.safeJson(input.metadataJson),
      },
    });
  }

  private errorDetails(error: unknown) {
    if (axios.isAxiosError(error)) {
      return {
        message: error.message,
        stack: error.stack,
        requestId: this.headerValue(error.response?.headers?.['x-request-id'] || error.response?.headers?.['request-id']),
        safeResponse: this.safeJson({
          status: error.response?.status,
          data: this.safeResponseData(error.response?.data),
        }),
      };
    }
    if (error instanceof Error) {
      const maybe = error as Error & { request_id?: string; requestID?: string; status?: number };
      return {
        message: error.message,
        stack: error.stack,
        requestId: maybe.request_id || maybe.requestID,
        safeResponse: this.safeJson({ status: maybe.status }),
      };
    }
    return { message: String(error), stack: undefined, requestId: undefined, safeResponse: undefined };
  }

  private headerValue(value: unknown) {
    return Array.isArray(value) ? String(value[0]) : value ? String(value) : undefined;
  }

  private safeResponseData(data: unknown) {
    if (Buffer.isBuffer(data)) return `[${data.length} bytes]`;
    if (typeof data === 'string') return data.slice(0, 2000);
    return data;
  }

  private safeJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value, (key, item) => {
      if (/api[_-]?key|token|secret|authorization|password/i.test(key)) return '[redacted]';
      if (typeof item === 'string' && item.length > 4000) return `${item.slice(0, 4000)}...`;
      return item;
    })) as Prisma.InputJsonValue;
  }

  private errorMessage(error: unknown) {
    if (axios.isAxiosError(error)) return { message: error.message, status: error.response?.status, data: error.response?.data };
    if (error instanceof Error) return error.message;
    return error;
  }

}
