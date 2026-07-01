import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requestCreatorAccount } from "@/lib/creator-account.functions";

const authSearch = z.object({
  mode: z.enum(["login", "register"]).optional().default("login"),
  type: z.enum(["user", "creator"]).optional().default("user"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearch,
  head: () => ({ meta: [{ title: "Entrar — Xclusive" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, type } = Route.useSearch();
  const navigate = useNavigate();
  const isRegister = mode === "register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [accountType, setAccountType] = useState<"user" | "creator">(type);
  const [submitting, setSubmitting] = useState(false);

  async function resolveDestination(userId: string, fallback: "user" | "creator" = "user"): Promise<"/creator-studio" | "/feed"> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const roles = (data ?? []).map((r: any) => r.role);
      if (roles.includes("creator") || roles.includes("admin")) return "/creator-studio";
      if (roles.includes("user") && fallback === "user") return "/feed";
      await new Promise((r) => setTimeout(r, 250));
    }

    return fallback === "creator" ? "/creator-studio" : "/feed";
  }

  async function ensureActiveSession() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { username: username.toLowerCase().replace(/[^a-z0-9_]/g, ""), role: accountType, display_name: username },
          },
        });
        if (error) throw error;
        toast.success(accountType === "creator"
          ? "Conta criada! A tua candidatura a criador está pendente de aprovação."
          : "Conta criada! Bem-vinda à Xclusive.");
        let userId = data.user?.id;
        if (!data.session) {
          const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
          userId = signIn.user?.id ?? userId;
        }

        const activeSession = data.session ?? await ensureActiveSession();
        if (!activeSession) {
          toast.success("Conta criada. Confirma o email e entra para aceder ao painel.");
          navigate({ to: "/auth", search: { mode: "login", type: accountType } });
          return;
        }

        if (accountType === "creator" && userId) {
          await requestCreatorAccount();
          navigate({ to: "/creator-studio" });
          return;
        }

        const dest = userId ? await resolveDestination(userId, accountType) : "/feed";
        navigate({ to: dest });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vinda de volta.");
        const dest = data.user ? await resolveDestination(data.user.id) : "/feed";
        navigate({ to: dest });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Algo correu mal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 block text-center text-2xl font-bold">
          X<span className="text-primary">clusive</span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 md:p-8 animate-fade-in">
          <h1 className="text-2xl font-semibold">{isRegister ? "Criar conta" : "Entrar"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRegister ? "Junta-te à Xclusive. +18 apenas." : "Acede ao teu painel."}
          </p>

          {isRegister && (
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-1">
              {(["user", "creator"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setAccountType(t)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${accountType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {t === "user" ? "Sou utilizador" : "Sou criador"}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={24}
                  placeholder="@nomedeartista"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none ring-primary focus:ring-2" />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none ring-primary focus:ring-2" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Palavra-passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none ring-primary focus:ring-2" />
            </div>

            <button type="submit" disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {submitting ? "A processar..." : isRegister ? "Criar conta" : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? "Já tens conta?" : "Ainda não tens conta?"}{" "}
            <Link to="/auth" search={{ mode: isRegister ? "login" : "register", type: accountType }} className="font-semibold text-primary hover:underline">
              {isRegister ? "Entrar" : "Criar conta"}
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuares confirmas que tens 18+ anos e aceitas os termos da plataforma.
        </p>
      </div>
    </div>
  );
}
