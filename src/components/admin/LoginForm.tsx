"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { api } from "@/lib/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api("/api/admin/auth/login", { body: { email, password } });
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
      return;
    }
    setBusy(false);
    setError(res.error ?? "Could not sign in.");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email">
        <input className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Password">
        <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      {error && <p className="text-[13px] text-danger bg-danger-bg px-3 py-2.5" role="alert">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
