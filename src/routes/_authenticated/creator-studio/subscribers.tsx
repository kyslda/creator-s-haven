import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/creator-studio/subscribers")({
  component: SubscribersPage,
});

function SubscribersPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["subscribers", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: subs, error } = await supabase.from("subscriptions")
        .select("id, status, started_at, expires_at, price_paid, subscriber_id")
        .eq("creator_id", user!.id)
        .order("started_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set(subs?.map((s) => s.subscriber_id) ?? [])];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids)
        : { data: [] };
      const map = new Map(profs?.map((p) => [p.id, p]));
      return subs?.map((s) => ({ ...s, profile: map.get(s.subscriber_id) }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscritores</h1>
        <p className="mt-1 text-sm text-muted-foreground">Total: {data?.length ?? 0}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">A carregar…</div>
        ) : data?.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Ainda sem subscritores.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Subscritor</th>
                <th className="px-5 py-3">Desde</th>
                <th className="px-5 py-3">Expira</th>
                <th className="px-5 py-3">Pago</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {s.profile?.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="font-medium">{s.profile?.display_name ?? s.profile?.username ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">@{s.profile?.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(s.started_at).toLocaleDateString("pt-PT")}</td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(s.expires_at).toLocaleDateString("pt-PT")}</td>
                  <td className="px-5 py-3">{s.price_paid} créd.</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
