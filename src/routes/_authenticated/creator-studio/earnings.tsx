import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { StatCard } from "@/components/studio/StatCard";
import { DollarSign, TrendingUp, Calendar, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/creator-studio/earnings")({
  component: EarningsPage,
});

const PLATFORM_FEE = 0.2;

function EarningsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["earnings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: profile }, { data: tx }] = await Promise.all([
        supabase.from("creator_profiles").select("total_earnings").eq("user_id", user!.id).maybeSingle(),
        supabase.from("credit_transactions").select("*").eq("user_id", user!.id).eq("type", "earning").order("created_at", { ascending: false }).limit(100),
      ]);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const weekStart = now.getTime() - 7 * 86400000;
      const month = (tx ?? []).filter((t) => new Date(t.created_at).getTime() >= monthStart).reduce((a, b) => a + b.amount, 0);
      const week = (tx ?? []).filter((t) => new Date(t.created_at).getTime() >= weekStart).reduce((a, b) => a + b.amount, 0);

      return { total: profile?.total_earnings ?? 0, month, week, tx: tx ?? [] };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-card" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-card" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Ganhos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acompanha o teu desempenho financeiro.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={`${data?.total ?? 0} créd.`} hint={`≈ $${((data?.total ?? 0) / 100).toFixed(2)}`} icon={DollarSign} />
        <StatCard label="Este mês" value={`${data?.month ?? 0} créd.`} icon={TrendingUp} />
        <StatCard label="Esta semana" value={`${data?.week ?? 0} créd.`} icon={Calendar} />
        <StatCard label="Disponível" value={`${data?.total ?? 0} créd.`} hint="Levantamento em breve" icon={Wallet} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Transações recentes</h2>
          <p className="text-xs text-muted-foreground">Comissão da plataforma: {PLATFORM_FEE * 100}%</p>
        </div>
        {data?.tx.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Sem ganhos ainda.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-5 py-3">Data</th><th className="px-5 py-3">Descrição</th><th className="px-5 py-3 text-right">Líquido</th></tr>
            </thead>
            <tbody>
              {data?.tx.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-5 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-PT")}</td>
                  <td className="px-5 py-3">{t.description ?? "Ganho"}</td>
                  <td className="px-5 py-3 text-right text-success font-medium">+{t.amount} créd.</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
