"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type BackgroundVideo = { id: string; originalName: string; durationSeconds: number; sizeBytes: string };
type UploadItem = { id: string; name: string; progress: number; status: "uploading" | "done" | "failed" };

export default function BackgroundVideosPage() {
  const [items, setItems] = useState<BackgroundVideo[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  async function load() {
    const res = await api.get("/background-videos");
    setItems(res.data);
  }

  useEffect(() => { load(); }, []);

  async function upload(file: File, id: string) {
    const data = new FormData();
    data.append("file", file);
    try {
      await api.post("/background-videos/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => setUploads((current) => current.map((item) => (
          item.id === id ? { ...item, progress: event.total ? Math.round((event.loaded / event.total) * 100) : item.progress } : item
        ))),
      });
      setUploads((current) => current.map((item) => (item.id === id ? { ...item, progress: 100, status: "done" } : item)));
    } catch {
      setUploads((current) => current.map((item) => (item.id === id ? { ...item, status: "failed" } : item)));
    }
  }

  async function uploadMany(fileList: FileList | null) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const queued = files.map((file) => ({ id: `${file.name}-${file.size}-${crypto.randomUUID()}`, name: file.name, progress: 0, status: "uploading" as const }));
    setUploads((current) => [...queued, ...current].slice(0, 12));
    await Promise.all(files.map((file, index) => upload(file, queued[index].id)));
    await load();
  }

  async function remove(id: string) {
    await api.delete(`/background-videos/${id}`);
    await load();
  }

  return (
    <AppShell>
      <div className="toolbar">
        <div><h1>Vídeos de fundo</h1><p className="muted">MP4, MOV ou AVI até 5GB.</p></div>
      </div>
      <label className="upload-zone field">
        <strong>Arraste ou selecione vídeos</strong>
        <span className="muted">Envie vários arquivos simultaneamente. MP4, MOV ou AVI até 5GB cada.</span>
        <input multiple type="file" accept="video/*" onChange={(event) => uploadMany(event.target.files)} />
      </label>
      {uploads.length > 0 && (
        <section className="card grid" style={{ marginTop: 16 }}>
          <h2>Uploads</h2>
          {uploads.map((upload) => (
            <div className="upload-row" key={upload.id}>
              <span>{upload.name}</span>
              <progress max="100" value={upload.progress} />
              <span className={upload.status === "failed" ? "upload-failed" : "muted"}>{upload.status === "failed" ? "falhou" : `${upload.progress}%`}</span>
            </div>
          ))}
        </section>
      )}
      <div className="grid cols" style={{ marginTop: 16 }}>
        {items.map((item) => (
          <article className="card grid" key={item.id}>
            <h2>{item.originalName}</h2>
            <p className="muted">{Math.round(item.durationSeconds)}s</p>
            <button className="button danger" onClick={() => remove(item.id)}>Excluir</button>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
