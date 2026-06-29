import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Plus, Lock, DollarSign, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/creator-studio/posts")({
  component: PostsPage,
});

type Filter = "all" | "free" | "subscribers" | "ppv";

function PostsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["my-posts", user?.id, filter],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase.from("posts").select("*").eq("creator_id", user!.id).order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("access", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  async function deletePost(id: string) {
    if (!confirm("Eliminar esta publicação? Esta ação é irreversível.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Publicação eliminada");
    qc.invalidateQueries({ queryKey: ["my-posts"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Minhas publicações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gere o teu conteúdo.</p>
        </div>
        <Link to="/creator-studio/upload" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Nova publicação
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { k: "all", l: "Todas" },
          { k: "free", l: "Gratuitas" },
          { k: "subscribers", l: "Subscritores" },
          { k: "ppv", l: "Pay-per-view" },
        ] as const).map(({ k, l }) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${filter === k ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : posts?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">Ainda não há publicações.</p>
          <Link to="/creator-studio/upload" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Publicar agora
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts?.map((p) => {
            const cover = p.media_urls?.[0];
            return (
              <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5">
                <div className="relative aspect-[4/5] bg-muted">
                  {cover && (p.media_types?.[0] === "video"
                    ? <video src={cover} className="h-full w-full object-cover" muted />
                    : <img src={cover} alt="" className="h-full w-full object-cover" />)}
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white">
                    {p.access === "free" && <Eye className="h-3 w-3" />}
                    {p.access === "subscribers" && <Lock className="h-3 w-3" />}
                    {p.access === "ppv" && <DollarSign className="h-3 w-3" />}
                    {p.access === "free" ? "Grátis" : p.access === "subscribers" ? "Subscritores" : `${p.price} créd.`}
                  </span>
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-medium">{p.title || "Sem título"}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{p.likes_count} likes</span>
                    <button onClick={() => deletePost(p.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
