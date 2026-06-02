"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Video Factory</div>
        <nav className="nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/projects">Projetos</Link>
          <Link href="/projects/new">Novo projeto</Link>
          <Link href="/channels">Canais</Link>
          <Link href="/background-videos">Vídeos de fundo</Link>
          <Link href="/settings">Configurações</Link>
          <button onClick={logout}>Sair</button>
        </nav>
        <p className="muted" style={{ marginTop: 24 }}>{user?.name}</p>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
