import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, FileImage, MessageSquare, ShieldCheck, Plus } from "lucide-react";
import { StatCard } from "@/components/studio/StatCard";

export const Route = createFileRoute("/_authenticated/creator-studio/")({
  component: Dashboard,
});

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["creator-dashboard", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [profile, posts, subsCount, unread] = await Promise.all([
        supabase.from("creator_profiles").select("*").eq("user_id", uid!).maybeSingle(),
        supabase.from("posts").select("id, title, access, likes_count, comments_count, media_urls, thumbnail_url, created_at").eq("creator_id", uid!).order("created_at", { ascending: false }).limit(5),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("creator_id", uid!).eq("status", "active"),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", uid!).eq("is_read", false),
      ]);
      return {
        profile: profile.data,
        recent: posts.data ?? [],
        subscribers: subsCount.count ?? 0,
        unread: unread.count ?? 0,
      };
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-card" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-card" />)}
        </div>
      </div>
    );
  }

  const earnings = data?.profile?.total_earnings ?? 0;
  const isApproved = data?.profile?.is_approved ?? false;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            Olá, {user?.profile?.display_name ?? user?.profile?.username}
            {isApproved && <ShieldCheck className="h-5 w-5 text-primary" />}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isApproved ? "Estúdio do criador" : "A tua conta de criador está pendente de aprovação pelo administrador."}
          </p>
        </div>
        <Link to="/creator-studio/upload" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Publicar conteúdo
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Subscritores" value={String(data?.subscribers ?? 0)} icon={Users} />
        <StatCard label="Ganhos totais" value={formatCredits(earnings)} hint={`≈ $${(earnings / 100).toFixed(2)}`} icon={DollarSign} />
        <StatCard label="Publicações" value={String(data?.recent.length ?? 0)} icon={FileImage} />
        <StatCard label="Mensagens não lidas" value={String(data?.unread ?? 0)} icon={MessageSquare} />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Publicações recentes</h2>
        </div>
        {data?.recent.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Ainda não publicaste nada. <Link to="/creator-studio/upload" className="text-primary font-medium">Publica o primeiro post</Link>.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data?.recent.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {p.thumbnail_url || p.media_urls?.[0] ? (
                    <img src={p.thumbnail_url ?? p.media_urls[0]} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.title || "Sem título"}</div>
                  <div className="text-xs text-muted-foreground capitalize">{p.access} · {new Date(p.created_at).toLocaleDateString("pt-PT")}</div>
                </div>
                <div className="text-xs text-muted-foreground">{p.likes_count} likes · {p.comments_count} comentários</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatCredits(n: number) {
  return n.toLocaleString("pt-PT") + " créd.";
}
