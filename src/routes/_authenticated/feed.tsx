import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { Heart, MessageCircle, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["feed"],
    queryFn: async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("id, title, description, media_urls, media_types, thumbnail_url, is_free, price, likes_count, comments_count, created_at, creator_id, profiles:creator_id(username, display_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(30);
      return posts ?? [];
    },
  });

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Feed</h1>
          <p className="text-sm text-muted-foreground">Conteúdo recente dos criadores.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-80 animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center text-sm text-muted-foreground">
          Subscreve os teus criadores favoritos para ver conteúdo aqui.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {data!.map((p: any) => {
            const locked = !p.is_free;
            const firstUrl = p.media_urls?.[0];
            const firstType = p.media_types?.[0];
            return (
              <article key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <Link to="/creator/$username" params={{ username: p.profiles?.username ?? "" }} className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {p.profiles?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{p.profiles?.display_name ?? p.profiles?.username}</div>
                    <div className="text-xs text-muted-foreground">@{p.profiles?.username} · {new Date(p.created_at).toLocaleDateString("pt-PT")}</div>
                  </div>
                </Link>
                {firstUrl && (
                  <div className="relative aspect-video bg-black">
                    {firstType === "video" ? (
                      <video src={firstUrl} className={`h-full w-full object-cover ${locked ? "blur-locked" : ""}`} controls={!locked} />
                    ) : (
                      <img src={firstUrl} alt={p.title ?? ""} className={`h-full w-full object-cover ${locked ? "blur-locked" : ""}`} />
                    )}
                    {locked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-center">
                        <Lock className="h-6 w-6 text-primary" />
                        <div className="text-sm font-medium text-white">
                          {p.price > 0 ? `Desbloquear por ${p.price} créd.` : "Subscritores apenas"}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  {p.title && <h2 className="font-semibold">{p.title}</h2>}
                  {p.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {p.likes_count}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {p.comments_count}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
