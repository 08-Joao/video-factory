# video-factory

## Audio, logs e thumbnails

O backend usa BullMQ para enfileirar as etapas de processamento. Áudios com falha podem ser regerados pelo detalhe do projeto ou pela API:

```bash
curl -X POST http://localhost:3000/projects/PROJECT_ID/audio/AUDIO_ID/regenerate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force":true,"provider":"elevenlabs"}'
```

Se o áudio já estiver pronto, envie `force=true`. A regeneração cria um novo caminho de saída para não apagar o arquivo anterior do storage. Para OpenAI TTS, envie `{"force":true,"provider":"openai","voice":"alloy"}`; o modelo padrão é `gpt-4o-mini-tts`.

Logs seguros de processamento ficam em:

```bash
curl "http://localhost:3000/projects/PROJECT_ID/logs?action=audio_generation" \
  -H "Authorization: Bearer TOKEN"
```

Use `action=thumbnail_generation` para ver os logs da thumbnail.

## OpenAI Images

Configure:

```env
IMAGE_PROVIDER=openai
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_IMAGE_QUALITY=medium
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
THUMBNAIL_STYLE=cartoon
THUMBNAIL_WIDTH=1280
THUMBNAIL_HEIGHT=720
```

Gerar ou regerar a thumbnail base do projeto:

```bash
curl -X POST http://localhost:3000/projects/PROJECT_ID/thumbnail/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force":true,"provider":"openai","style":"cartoon"}'
```

A thumbnail pertence ao projeto principal, não ao idioma. O prompt reforça: sem texto, sem letras, sem logos, sem legendas e sem watermark. A imagem gerada é convertida/cortada para 1280x720.
