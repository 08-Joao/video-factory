"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";

const schema = z.object({ email: z.email(), password: z.string().min(6) });
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  async function submit(data: Form) {
    setError("");
    try { await login(data.email, data.password); } catch { setError("Não foi possível entrar com essas credenciais."); }
  }

  return (
    <div className="auth-page">
      <form className="auth-box card grid" onSubmit={handleSubmit(submit)}>
        <div>
          <h1>Entrar</h1>
          <p className="muted">Acesse sua fábrica de vídeos.</p>
        </div>
        <label className="field">E-mail<input className="input" {...register("email")} /></label>
        <label className="field">Senha<input className="input" type="password" {...register("password")} /></label>
        {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
        <button className="button" disabled={formState.isSubmitting}>Entrar</button>
        <Link className="muted" href="/register">Criar conta</Link>
      </form>
    </div>
  );
}
