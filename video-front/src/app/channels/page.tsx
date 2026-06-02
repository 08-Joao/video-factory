"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import type { Channel } from "@/types";

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [form, setForm] = useState({ platform: "YOUTUBE", name: "", language: "pt-BR", token: "" });

  async function load() {
    const res = await api.get("/channels");
    setChannels(res.data);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await api.post("/channels", form);
    setForm({ platform: "YOUTUBE", name: "", language: "pt-BR", token: "" });
    await load();
  }

  async function disconnect(id: string) {
    await api.delete(`/channels/${id}`);
    await load();
  }

  async function connectYoutube() {
    const res = await api.get("/channels/youtube/auth-url");
    window.location.href = res.data.url;
  }

  return (
    <AppShell>
      <div className="toolbar">
        <div><h1>Canais</h1><p className="muted">Destino dos vídeos por plataforma e idioma.</p></div>
        <button className="button secondary" onClick={connectYoutube}>Conectar YouTube</button>
      </div>
      <form className="card grid" onSubmit={submit}>
        <div className="grid cols">
          <label className="field">Plataforma<select className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}><option>YOUTUBE</option><option>TIKTOK</option></select></label>
          <label className="field">Nome<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label className="field">Idioma<select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}><option>pt-BR</option><option>en-US</option><option>es-ES</option></select></label>
          <label className="field">Token TikTok<input className="input" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} /></label>
        </div>
        <button className="button">Adicionar canal</button>
      </form>
      <div className="grid cols" style={{ marginTop: 16 }}>
        {channels.map((channel) => (
          <article className="card grid" key={channel.id}>
            <div className="row"><span className="badge">{channel.platform}</span><span className="muted">{channel.language}</span></div>
            <h2>{channel.name}</h2>
            <button className="button danger" onClick={() => disconnect(channel.id)}>Desconectar</button>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
