"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const res = await api.post("/projects", { theme });
    router.push(`/projects/${res.data.id}`);
  }

  return (
    <AppShell>
      <div className="page-head">
        <div><h1>Novo projeto</h1><p className="muted">Descreva a ideia central. Apenas o roteiro sera gerado automaticamente.</p></div>
      </div>
      <form className="compose-panel" onSubmit={submit}>
        <div className="field">
          <label htmlFor="theme">Tema da historia</label>
          <textarea id="theme" className="input story-input" rows={12} value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="Ex: emprestei dinheiro para meu irmao e descobri uma mentira da minha familia..." required />
          <span className="muted">Depois da aprovacao, audio, thumbnail e video ficam disponiveis para gerar manualmente.</span>
        </div>
        <div className="action-strip">
          <button className="button" disabled={loading || !theme.trim()}>{loading ? "Gerando roteiro..." : "Gerar roteiro"}</button>
        </div>
      </form>
    </AppShell>
  );
}
