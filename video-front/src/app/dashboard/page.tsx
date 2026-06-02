"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { Project } from "@/types";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.get("/projects").then((res) => setProjects(res.data.items));
  }, []);

  const published = projects.filter((p) => p.status === "PUBLISHED").length;
  const ready = projects.filter((p) => p.status === "READY_TO_PUBLISH").length;

  return (
    <AppShell>
      <div className="toolbar">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Visão geral da produção.</p>
        </div>
        <Link className="button" href="/projects/new">Novo Projeto</Link>
      </div>
      <section className="grid cols">
        <div className="card"><p className="muted">Projetos</p><h2>{projects.length}</h2></div>
        <div className="card"><p className="muted">Prontos</p><h2>{ready}</h2></div>
        <div className="card"><p className="muted">Publicados</p><h2>{published}</h2></div>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Últimos projetos</h2>
        <table className="table">
          <tbody>
            {projects.slice(0, 5).map((project) => (
              <tr key={project.id}>
                <td><Link href={`/projects/${project.id}`}>{project.theme}</Link></td>
                <td><StatusBadge status={project.status} /></td>
                <td>{project.viralScore?.toFixed(1) || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
