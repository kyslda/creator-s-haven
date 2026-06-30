import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app/AppShell";
import { toast } from "sonner";
import { Wallet, Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  component: WalletPage,
});

type Pack = { usd: number; credits: number; badge?: string };
const PACKS: Pack[] = [
  { usd: 5, credits: 500 },
  { usd: 10, credits: 1000 },
  { usd: 25, credits: 2500, badge: "Popular" },
  { usd: 50, credits: 5000 },
  { usd: 100, credits: 10500, badge: "+5% Bónus" },
];

function WalletPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pack, setPack] = useState<Pack | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["wallet-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("credits").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: tx } = useQuery({
    queryKey: ["wallet-tx", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("credit_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const credits = profile?.credits ?? user?.profile?.credits ?? 0;

  async function confirmTopUp() {
    if (!pack || !user) return;
    setBusy(true);
    try {
      const newBalance = credits + pack.credits;
      const { error: upErr } = await supabase.from("profiles").update({ credits: newBalance }).eq("id", user.id);
      if (upErr) throw upErr;
      const { error: txErr } = await supabase.from("credit_transactions").insert({
        user_id: user.id,
        type: "top_up",
        amount: pack.credits,
        balance_after: newBalance,
        description: `Carregamento simulado $${pack.usd}`,
      });
      if (txErr) throw txErr;
      toast.success(`+${pack.credits} créditos adicionados`);
      setPack(null);
      qc.invalidateQueries({ queryKey: ["wallet-profile"] });
      qc.invalidateQueries({ queryKey: ["wallet-tx"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar créditos");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Carteira</h1>
      <p className="text-sm text-muted-foreground">Carrega créditos para subscrever criadores e desbloquear conteúdo.</p>

      <div className="mt-6 rounded-xl border border-border bg-card p-8">
        <div className="flex items-center gap-3 text-muted-foreground"><Wallet className="h-5 w-5 text-primary" /> Saldo actual</div>
        <div className="mt-2 text-5xl font-bold">{credits} <span className="text-xl font-medium text-muted-foreground">créditos</span></div>
        <div className="mt-1 text-sm text-muted-foreground">≈ ${(credits / 100).toFixed(2)}</div>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Carregar créditos</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PACKS.map((p) => (
          <button key={p.usd} onClick={() => setPack(p)}
            className="relative rounded-xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/50">
            {p.badge && <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{p.badge}</span>}
            <div className="text-2xl font-bold">${p.usd}</div>
            <div className="mt-1 text-sm text-muted-foreground">{p.credits} créditos</div>
            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary"><Plus className="h-4 w-4" /> Carregar</div>
          </button>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Histórico</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        {(tx?.length ?? 0) === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Sem transações ainda.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-5 py-3">Data</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Descrição</th><th className="px-5 py-3 text-right">Valor</th><th className="px-5 py-3 text-right">Saldo</th></tr>
            </thead>
            <tbody>
              {tx!.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-5 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-PT")}</td>
                  <td className="px-5 py-3">{t.type}</td>
                  <td className="px-5 py-3">{t.description ?? "—"}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${t.amount >= 0 ? "text-success" : "text-primary"}`}>{t.amount >= 0 ? "+" : ""}{t.amount}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{t.balance_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !busy && setPack(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">Confirmar carregamento</h3>
              <button onClick={() => !busy && setPack(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Pacote" value={`$${pack.usd}`} />
              <Row label="Créditos" value={`+${pack.credits}`} />
              <Row label="Saldo actual" value={`${credits}`} />
              <div className="my-2 border-t border-border" />
              <Row label="Saldo após" value={`${credits + pack.credits}`} highlight />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Pagamento simulado. Sem cobrança real.</p>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setPack(null)} disabled={busy} className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-secondary">Cancelar</button>
              <button onClick={confirmTopUp} disabled={busy} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {busy ? "A processar..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-base font-bold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}
