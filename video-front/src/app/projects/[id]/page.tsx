"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { AppShell } from "@/components/AppShell";
import { JobProgressStepper } from "@/components/JobProgressStepper";
import { StatusBadge } from "@/components/StatusBadge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ViralScoreDisplay } from "@/components/ViralScoreDisplay";
import { API_URL, api, fileUrl } from "@/lib/api";
import type { Channel, ProcessingLog, Project } from "@/types";

const flowSteps = [
  { key: "translation", title: "Traduções", description: "Prepara os idiomas configurados para narracao.", metric: (project: Project) => `${project.translations?.length || 0} prontas` },
  { key: "audio-generation", title: "Áudios", description: "Gera a narracao com a voz contextual.", metric: (project: Project) => `${project.audioFiles?.filter((audio) => audio.status === "DONE").length || 0} prontos` },
  { key: "thumbnail", title: "Thumbnail", description: "Cria a imagem no DALL-e para usar como capa.", metric: (project: Project) => project.thumbnail?.status === "DONE" ? "pronta" : project.thumbnail?.status === "FAILED" ? "falhou" : "pendente" },
  { key: "video-editing", title: "Vídeos", description: "Monta longos e shorts usando os audios gerados.", metric: (project: Project) => `${project.videoFiles?.length || 0} gerados` },
];

function formatDuration(seconds?: number) {
  const total = Math.max(0, Math.round(seconds || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [includeShorts, setIncludeShorts] = useState(true);
  const [messages, setMessages] = useState<string[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [runningStep, setRunningStep] = useState("");
  const [regeneratingAudioId, setRegeneratingAudioId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState("");

  useEffect(() => { params.then((value) => setId(value.id)); }, [params]);
  const load = useMemo(() => async () => {
    if (!id) return;
    const [projectRes, channelsRes] = await Promise.all([api.get(`/projects/${id}`), api.get("/channels")]);
    setProject(projectRes.data);
    setChannels(channelsRes.data);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const token = localStorage.getItem("vf_token");
    if (!token || !id) return;
    const socket = io(API_URL, { auth: { token } });
    socket.on("job:progress", (event) => {
      if (event.projectId === id) {
        setMessages((items) => [`${event.step}: ${event.message}`, ...items].slice(0, 8));
        load();
      }
    });
    return () => { socket.disconnect(); };
  }, [id, load]);

  async function action(path: string) {
    await api.patch(`/projects/${id}/${path}`);
    await load();
  }

  async function approve() {
    await api.patch(`/projects/${id}/approve`, {});
    await load();
  }

  async function runStep(step: string) {
    setRunningStep(step);
    try {
      await api.post(`/projects/${id}/run/${step}`);
      await load();
    } finally {
      setRunningStep("");
    }
  }

  async function loadLogs(action?: string) {
    const res = await api.get(`/projects/${id}/logs`, { params: action ? { action } : undefined });
    setLogs(res.data);
    setShowLogs(true);
  }

  async function regenerateAudio(audioId: string, force = false) {
    setRegeneratingAudioId(audioId);
    try {
      await api.post(`/projects/${id}/audio/${audioId}/regenerate`, { force, provider: "elevenlabs" });
      await load();
      await loadLogs("audio_generation");
    } finally {
      setRegeneratingAudioId("");
    }
  }

  async function generateThumbnail(force = false) {
    setRunningStep("thumbnail");
    try {
      await api.post(`/projects/${id}/thumbnail/generate`, { force, provider: "openai", style: "cartoon" });
      await load();
      await loadLogs("thumbnail_generation");
    } finally {
      setRunningStep("");
    }
  }

  async function publish() {
    await api.post(`/projects/${id}/publish`, { channelIds: selected, includeShorts });
    await load();
  }

  async function deleteProject() {
    const ok = window.confirm("Apagar este projeto e todos os arquivos gerados?");
    if (!ok) return;
    setDeleting(true);
    await api.delete(`/projects/${id}`);
    router.push("/projects");
  }

  async function deleteVideo(videoId: string) {
    const ok = window.confirm("Apagar este vídeo gerado?");
    if (!ok) return;
    setDeletingVideoId(videoId);
    try {
      await api.delete(`/projects/${id}/videos/${videoId}`);
      await load();
    } finally {
      setDeletingVideoId("");
    }
  }

  function videoPoster(videoPath: string) {
    return videoPath.replace(/\.mp4$/i, ".jpg");
  }

  if (!project) return <AppShell><p>Carregando...</p></AppShell>;
  const canRunManualFlow = !["PENDING_SCRIPT", "SCRIPT_GENERATED", "SCRIPT_REJECTED", "PUBLISHED"].includes(project.status);
  const doneVideos = project.videoFiles || [];
  const audioFiles = project.audioFiles || [];
  const longVideos = doneVideos.filter((video) => video.type === "LONG");
  const shortVideos = doneVideos.filter((video) => video.type === "SHORT");
  const narratorLabel = project.script?.narratorGender === "male" ? "masculino" : project.script?.narratorGender === "female" ? "feminino" : "não definido";

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <Link className="back-link" href="/projects">Projetos</Link>
          <h1>{project.theme}</h1>
          <div className="row">
            <StatusBadge status={project.status} />
            <span className="badge">narrador {narratorLabel}</span>
            <span className="muted">Criado em {new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <button className="button danger" disabled={deleting} onClick={deleteProject}>{deleting ? "Apagando..." : "Apagar projeto"}</button>
      </div>

      <div className="project-layout">
        <aside className="side-panel grid">
          <section className="card compact">
            <h2>Status</h2>
            <JobProgressStepper status={project.status} />
          </section>
          <section className="card compact">
            <h2>Score viral</h2>
            <ViralScoreDisplay score={project.viralScore || project.script?.viralScore} />
          </section>
          <section className="card compact">
            <h2>Narrador</h2>
            <div className="metric-row">
              <strong>{narratorLabel}</strong>
              <span className="muted">voz contextual</span>
            </div>
          </section>
          <section className="card compact">
            <h2>Eventos</h2>
            {messages.length ? messages.map((message) => <p className="event-line" key={message}>{message}</p>) : <p className="muted">Os eventos do job aparecem aqui em tempo real.</p>}
          </section>
        </aside>

        <main className="grid">
          {project.script && (
            <section className="card grid">
              <div className="section-head">
                <div>
                  <h2>Roteiro</h2>
                  <p className="muted">{project.script.viralReason}</p>
                </div>
                {project.script.narratorGender && <span className="badge">voz {project.script.narratorGender === "male" ? "masculina" : "feminina"}</span>}
              </div>
              <p className="pre script-preview">{project.script.content}</p>
              {project.status === "SCRIPT_GENERATED" && (
                <div className="action-strip">
                  <button className="button" onClick={approve}>Aprovar roteiro</button>
                  <button className="button danger" onClick={() => action("reject")}>Rejeitar</button>
                </div>
              )}
            </section>
          )}

          {canRunManualFlow && (
            <section className="card grid">
              <div className="section-head">
                <div>
                  <h2>Geração manual</h2>
                  <p className="muted">Escolha uma etapa e execute quando estiver pronto.</p>
                </div>
              </div>
              <div className="node-grid">
                {flowSteps.map((step) => (
                  <article className="node-card" key={step.key}>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                    </div>
                    <span>{step.metric(project)}</span>
                    <button className="button secondary" disabled={runningStep === step.key} onClick={() => runStep(step.key)}>
                      {runningStep === step.key ? "Enfileirando..." : "Gerar"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="media-board">
            <div className="card grid">
              <div className="section-head">
                <div>
                  <h2>Áudios</h2>
                  <p className="muted">Prévia das narrações geradas para cada idioma.</p>
                </div>
                {project.script?.narratorGender && <span className="badge">voz {project.script.narratorGender === "male" ? "masculina" : "feminina"}</span>}
              </div>
              {audioFiles.length ? (
                <div className="audio-grid">
                  {audioFiles.map((audio) => (
                    <article className="audio-card" key={audio.id}>
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <strong>{audio.language}</strong>
                        <span className="badge">{audio.status}</span>
                      </div>
                      <audio controls preload="metadata" src={fileUrl(audio.filePath)} />
                      <div className="audio-meta">
                        <span>{formatDuration(audio.durationSeconds)}</span>
                        {audio.voice || audio.elevenLabsVoiceId ? <span>voz {audio.voice || audio.elevenLabsVoiceId}</span> : null}
                        {audio.attempt ? <span>tentativa {audio.attempt}</span> : null}
                      </div>
                      {audio.errorMessage && <p className="error-note">{audio.errorMessage}</p>}
                      <div className="action-strip">
                        {audio.status === "FAILED" ? (
                          <button className="button" disabled={regeneratingAudioId === audio.id} onClick={() => regenerateAudio(audio.id)}>
                            {regeneratingAudioId === audio.id ? "Enfileirando..." : "Regerar áudio"}
                          </button>
                        ) : (
                          <button className="button secondary" disabled={regeneratingAudioId === audio.id} onClick={() => {
                            if (window.confirm("Regerar este áudio e manter o arquivo anterior no storage?")) regenerateAudio(audio.id, true);
                          }}>Regerar</button>
                        )}
                        <button className="button secondary" onClick={() => loadLogs("audio_generation")}>Ver log</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <strong>Nenhum áudio gerado</strong>
                  <span className="muted">Gere os áudios depois de aprovar o roteiro e criar as traduções.</span>
                </div>
              )}
            </div>

            <div className="card grid">
              <div className="section-head">
                <div>
                  <h2>Thumbnail</h2>
                  <p className="muted">Base sem texto, reutilizável para todos os idiomas.</p>
                </div>
                <span className="badge">{project.thumbnail?.status || "PENDING"}</span>
              </div>
              {project.thumbnail?.status === "DONE" ? (
                <img className="thumbnail-preview" src={fileUrl(project.thumbnail.filePath)} alt="Thumbnail" />
              ) : (
                <div className="empty-state">
                  <strong>{project.thumbnail?.status === "FAILED" ? "Thumbnail falhou" : "Nenhuma thumbnail gerada"}</strong>
                  <span className="muted">Use o card de geração manual para criar a imagem no DALL-e.</span>
                </div>
              )}
              {project.thumbnail?.errorMessage && <p className="error-note">{project.thumbnail.errorMessage}</p>}
              {project.thumbnail?.prompt && <p className="pre log-text">{project.thumbnail.prompt}</p>}
              <div className="audio-meta">
                {project.thumbnail?.provider && <span>{project.thumbnail.provider}</span>}
                {project.thumbnail?.model && <span>{project.thumbnail.model}</span>}
                {project.thumbnail?.style && <span>{project.thumbnail.style}</span>}
                {project.thumbnail?.width && project.thumbnail?.height && <span>{project.thumbnail.width}x{project.thumbnail.height}</span>}
              </div>
              <div className="action-strip">
                <button className="button" disabled={runningStep === "thumbnail"} onClick={() => generateThumbnail(Boolean(project.thumbnail))}>
                  {runningStep === "thumbnail" ? "Enfileirando..." : project.thumbnail ? "Regenerar thumbnail" : "Gerar thumbnail"}
                </button>
                <button className="button secondary" onClick={() => loadLogs("thumbnail_generation")}>Ver log</button>
              </div>
            </div>

            <div className="card grid">
              <h2>Vídeos longos</h2>
              {longVideos.length ? (
                <div className="video-grid">
                  {longVideos.map((video) => (
                    <div className="video-tile" key={video.id}>
                      <div className="section-head">
                        <h3>{video.language}</h3>
                        <button className="button secondary" disabled={deletingVideoId === video.id} onClick={() => deleteVideo(video.id)}>
                          {deletingVideoId === video.id ? "Apagando..." : "Apagar"}
                        </button>
                      </div>
                      <VideoPlayer filePath={video.filePath} poster={videoPoster(video.filePath)} />
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state"><strong>Nenhum vídeo longo</strong><span className="muted">Gere os vídeos depois de criar os áudios.</span></div>}
            </div>

            <div className="card grid">
              <h2>Shorts</h2>
              {shortVideos.length ? (
                <div className="shorts-grid">
                  {shortVideos.map((video) => (
                    <div className="video-tile short" key={video.id}>
                      <div className="section-head">
                        <h3>{video.language}{video.partNumber ? ` · parte ${video.partNumber}` : ""}</h3>
                        <button className="button secondary" disabled={deletingVideoId === video.id} onClick={() => deleteVideo(video.id)}>
                          {deletingVideoId === video.id ? "Apagando..." : "Apagar"}
                        </button>
                      </div>
                      <VideoPlayer filePath={video.filePath} poster={videoPoster(video.filePath)} vertical />
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state"><strong>Nenhum short</strong><span className="muted">Os shorts aparecem aqui em formato vertical.</span></div>}
            </div>
          </section>

          {showLogs && (
            <section className="card grid">
              <div className="section-head">
                <div>
                  <h2>Logs</h2>
                  <p className="muted">Eventos recentes de processamento sem chaves ou tokens.</p>
                </div>
                <button className="button secondary" onClick={() => setShowLogs(false)}>Fechar</button>
              </div>
              {logs.length ? logs.map((log) => (
                <article className="log-card" key={log.id}>
                  <div className="row">
                    <span className="badge">{log.status}</span>
                    <strong>{log.action}</strong>
                    <span className="muted">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  {log.message && <p>{log.message}</p>}
                  {log.errorMessage && <p className="error-note">{log.errorMessage}</p>}
                  <div className="audio-meta">
                    {log.provider && <span>{log.provider}</span>}
                    {log.model && <span>{log.model}</span>}
                    {log.voice && <span>voz {log.voice}</span>}
                    {log.attempt && <span>tentativa {log.attempt}</span>}
                  </div>
                  {log.errorStack && <pre className="log-text">{log.errorStack}</pre>}
                  {log.metadataJson && <pre className="log-text">{JSON.stringify(log.metadataJson, null, 2)}</pre>}
                </article>
              )) : <div className="empty-state"><strong>Nenhum log encontrado</strong><span className="muted">Os logs aparecem quando um job inicia, conclui ou falha.</span></div>}
            </section>
          )}

          <section className="card grid">
            <h2>Publicar</h2>
            <div className="grid cols">
              {channels.map((channel) => (
                <label className="select-card row" key={channel.id}>
                  <input type="checkbox" checked={selected.includes(channel.id)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, channel.id] : items.filter((item) => item !== channel.id))} />
                  <span>{channel.name}</span><span className="badge">{channel.platform}</span><span className="muted">{channel.language}</span>
                </label>
              ))}
            </div>
            <label className="row"><input type="checkbox" checked={includeShorts} onChange={(event) => setIncludeShorts(event.target.checked)} /> incluir shorts</label>
            <button className="button" disabled={!selected.length || !doneVideos.length} onClick={publish}>Publicar</button>
          </section>
        </main>
      </div>
    </AppShell>
  );
}
