import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/creator-studio/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [subscriptionPrice, setSubscriptionPrice] = useState(999);
  const [welcome, setWelcome] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [tiktok, setTiktok] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [{ data: prof }, { data: cp }] = await Promise.all([
        supabase.from("profiles").select("display_name, bio, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("creator_profiles").select("subscription_price, cover_image_url, welcome_message, social_links").eq("user_id", user.id).maybeSingle(),
      ]);
      setDisplayName(prof?.display_name ?? "");
      setBio(prof?.bio ?? "");
      setAvatarUrl(prof?.avatar_url ?? "");
      setCoverUrl(cp?.cover_image_url ?? "");
      setSubscriptionPrice(cp?.subscription_price ?? 999);
      setWelcome(cp?.welcome_message ?? "");
      const sl = (cp?.social_links as any) ?? {};
      setInstagram(sl.instagram ?? "");
      setTwitter(sl.twitter ?? "");
      setTiktok(sl.tiktok ?? "");
      setLoading(false);
    })();
  }, [user?.id]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("profiles").update({ display_name: displayName, bio, avatar_url: avatarUrl }).eq("id", user.id),
        supabase.from("creator_profiles").update({
          subscription_price: subscriptionPrice,
          cover_image_url: coverUrl,
          welcome_message: welcome,
          social_links: { instagram, twitter, tiktok },
        }).eq("user_id", user.id),
      ]);
      if (e1 || e2) throw e1 ?? e2;
      toast.success("Perfil actualizado");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">A carregar…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Definições do perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Como apareces para os subscritores.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <Field label="Nome de exibição"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} /></Field>
        <Field label="Bio"><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={300} className={inputCls} /></Field>
        <Field label="URL do avatar"><input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className={inputCls} /></Field>
        <Field label="URL da foto de capa"><input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." className={inputCls} /></Field>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold">Monetização</h3>
        <Field label="Preço mensal de subscrição (créditos)" hint={`≈ $${(subscriptionPrice / 100).toFixed(2)}`}>
          <input type="number" min={300} step={50} value={subscriptionPrice} onChange={(e) => setSubscriptionPrice(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Mensagem de boas-vindas"><textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} rows={2} maxLength={500} className={inputCls} /></Field>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold">Redes sociais</h3>
        <Field label="Instagram"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@username" className={inputCls} /></Field>
        <Field label="Twitter / X"><input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@username" className={inputCls} /></Field>
        <Field label="TikTok"><input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@username" className={inputCls} /></Field>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {saving ? "A guardar…" : "Guardar alterações"}
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
