"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";

const schema = z.object({ name: z.string().min(2), email: z.email(), password: z.string().min(6) });
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: createAccount } = useAuth();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  async function submit(data: Form) {
    setError("");
    try { await createAccount(data.name, data.email, data.password); } catch { setError("Não foi possível criar a conta."); }
  }

  return (
    <div className="auth-page">
      <form className="auth-box card grid" onSubmit={handleSubmit(submit)}>
        <div>
          <h1>Criar conta</h1>
          <p className="muted">Comece a automatizar roteiros, áudios e vídeos.</p>
        </div>
        <label className="field">Nome<input className="input" {...register("name")} /></label>
        <label className="field">E-mail<input className="input" {...register("email")} /></label>
        <label className="field">Senha<input className="input" type="password" {...register("password")} /></label>
        {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
        <button className="button" disabled={formState.isSubmitting}>Criar conta</button>
        <Link className="muted" href="/login">Já tenho conta</Link>
      </form>
    </div>
  );
}
