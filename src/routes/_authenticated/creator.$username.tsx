import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/creator/$username")({
  component: CreatorProfile,
});

function CreatorProfile() {
  const { username } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["creator", username],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("id, username, display_name, avatar_url, bio").eq("username", username).maybeSingle();
      if (!profile) return null;
      const [{ data: cp }, { data: posts }] = await Promise.all([
        supabase.from("creator_profiles").select("*").eq("user_id", profile.id).maybeSingle(),
        supabase.from("posts").select("id, title, thumbnail_url, media_urls, is_free, price, created_at").eq("creator_id", profile.id).order("created_at", { ascending: false }).limit(24),
      ]);
      return { profile, creator: cp, posts: posts ?? [] };
    },
  });

  if (isLoading) return <AppShell><div className="h-64 animate-pulse rounded-xl bg-card" /></AppShell>;
  if (!data) return <AppShell><div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Criador não encontrado. <Link to="/feed" className="text-primary">Voltar ao feed</Link></div></AppShell>;

  const { profile, creator, posts } = data;
  const price = creator?.subscription_price ?? 999;

  return (
    <AppShell>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-48 w-full bg-gradient-to-br from-primary/30 to-background" style={creator?.cover_image_url ? { backgroundImage: `url(${creator.cover_image_url})`, backgroundSize: "cover" } : {}} />
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="-mt-16 flex h-20 w-20 items-center justify-center rounded-full border-4 border-card bg-primary text-2xl font-bold text-primary-foreground">
              {profile.username[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile.display_name ?? profile.username}</h1>
              <div className="text-sm text-muted-foreground">@{profile.username}</div>
              {profile.bio && <p className="mt-2 max-w-xl text-sm">{profile.bio}</p>}
            </div>
          </div>
          <button className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Assinar · {price} créd./mês
          </button>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Publicações</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {posts.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Ainda não há publicações.</div>
        ) : posts.map((p: any) => (
          <div key={p.id} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="aspect-square bg-black">
              {p.media_urls?.[0] && <img src={p.media_urls[0]} alt={p.title ?? ""} className={`h-full w-full object-cover ${!p.is_free ? "blur-locked" : ""}`} />}
            </div>
            <div className="p-3 text-sm">
              <div className="truncate font-medium">{p.title ?? "Sem título"}</div>
              <div className="text-xs text-muted-foreground">{p.is_free ? "Gratuito" : p.price > 0 ? `${p.price} créd.` : "Subscritores"}</div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
