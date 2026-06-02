"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ViralScoreDisplay } from "@/components/ViralScoreDisplay";
import { api, fileUrl } from "@/lib/api";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await api.get("/projects", { params: status ? { status } : {} });
    setProjects(res.data.items);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [status]);

  async function remove(id: string) {
    const ok = window.confirm("Apagar este projeto e todos os arquivos gerados?");
    if (!ok) return;
    await api.delete(`/projects/${id}`);
    await load();
  }

  return (
    <AppShell>
      <div className="page-head">
        <div><h1>Projetos</h1><p className="muted">Acompanhe cada historia da ideia ate a publicacao.</p></div>
        <Link className="button" href="/projects/new">Novo Projeto</Link>
      </div>
      <div className="filter-bar">
        <select className="input" style={{ maxWidth: 260 }} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos os status</option>
          <option value="SCRIPT_GENERATED">Aguardando aprovação</option>
          <option value="SCRIPT_APPROVED">Aprovados</option>
          <option value="AUDIO_GENERATING">Gerando audio</option>
          <option value="VIDEO_EDITING">Gerando video</option>
          <option value="READY_TO_PUBLISH">Prontos</option>
          <option value="PUBLISHED">Publicados</option>
          <option value="FAILED">Falhas</option>
        </select>
      </div>
      {loading ? <p className="muted">Carregando projetos...</p> : (
        <div className="project-list">
          {projects.map((project) => (
          <article className="project-card" key={project.id}>
            {project.thumbnail?.status === "DONE" ? <img src={fileUrl(project.thumbnail.filePath)} alt="" /> : <div className="project-thumb-empty">Sem thumbnail</div>}
            <div className="row" style={{ justifyContent: "space-between" }}>
              <StatusBadge status={project.status} />
              <span className="muted">{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
            <h2>{project.theme}</h2>
            <ViralScoreDisplay score={project.viralScore} />
            <div className="row">
              <Link className="button secondary" href={`/projects/${project.id}`}>Abrir</Link>
              <button className="button danger" onClick={() => remove(project.id)}>Apagar</button>
            </div>
          </article>
          ))}
          {!projects.length && <div className="empty-state"><strong>Nenhum projeto encontrado</strong><span className="muted">Crie um projeto para gerar o primeiro roteiro.</span></div>}
        </div>
      )}
    </AppShell>
  );
}
