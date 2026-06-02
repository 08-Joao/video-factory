"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

const languages = ["pt-BR", "en-US", "es-ES"];

export default function SettingsPage() {
  const [settings, setSettings] = useState({ viralScoreThreshold: 7, defaultLanguages: languages, defaultVoiceId: "21m00Tcm4TlvDq8ikWAM", autoRunAfterApproval: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/settings").then((res) => setSettings(res.data));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const res = await api.patch("/settings", settings);
    setSettings(res.data);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <AppShell>
      <div className="toolbar">
        <div><h1>Configurações</h1><p className="muted">Ajustes de aprovação automática e idiomas.</p></div>
      </div>
      <form className="card grid" onSubmit={submit}>
        <label className="field">
          Viral Score Threshold: {settings.viralScoreThreshold}
          <input className="input" type="range" min="0" max="10" step="0.1" value={settings.viralScoreThreshold} onChange={(event) => setSettings({ ...settings, viralScoreThreshold: Number(event.target.value) })} />
        </label>
        <div className="field">
          Idiomas padrão
          <div className="row">
            {languages.map((language) => (
              <label className="row" key={language}>
                <input type="checkbox" checked={settings.defaultLanguages.includes(language)} onChange={(event) => setSettings({
                  ...settings,
                  defaultLanguages: event.target.checked ? [...settings.defaultLanguages, language] : settings.defaultLanguages.filter((item) => item !== language),
                })} />
                {language}
              </label>
            ))}
          </div>
        </div>
        <label className="field">Voz ElevenLabs<input className="input" value={settings.defaultVoiceId} onChange={(event) => setSettings({ ...settings, defaultVoiceId: event.target.value })} /></label>
        <div className="grid cols">
          <div className="card"><span className="muted">OpenAI</span><p>sk-••••••••••</p></div>
          <div className="card"><span className="muted">ElevenLabs</span><p>sk-••••••••••</p></div>
        </div>
        <button className="button">Salvar</button>
        {saved && <p style={{ color: "var(--good)" }}>Configurações salvas.</p>}
      </form>
    </AppShell>
  );
}
