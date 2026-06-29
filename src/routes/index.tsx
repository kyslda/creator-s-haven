import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Sparkles, Wallet, Camera } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xclusive — Conteúdo exclusivo de criadores" },
      { name: "description", content: "Apoia criadores. Desbloqueia conteúdo exclusivo. Monetiza a tua audiência." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight">
            X<span className="text-primary">clusive</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/auth" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Entrar</Link>
          <Link to="/auth" search={{ mode: "register" as const }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Criar conta</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 md:py-32 md:px-12 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Apenas para maiores de 18 anos
        </div>
        <h1 className="text-balance text-5xl font-bold leading-[1.05] md:text-7xl">
          Conteúdo exclusivo.
          <br />
          <span className="text-primary">Sem intermediários.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
          Subscreve os teus criadores favoritos ou monetiza a tua audiência directamente. Pagamento por créditos, sem complicações.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/auth" search={{ mode: "register" as const, type: "creator" as const }} className="rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90">
            Tornar-me criador
          </Link>
          <Link to="/auth" search={{ mode: "register" as const }} className="rounded-lg border border-border bg-card px-6 py-3 text-base font-semibold hover:bg-secondary">
            Explorar criadores
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-3 md:px-12">
        {[
          { icon: Camera, t: "Publica em segundos", d: "Fotos e vídeos com upload directo. Define livre, subscritor ou pay-per-view." },
          { icon: Lock, t: "Controlo total", d: "Tu decides o preço da subscrição e o que está bloqueado para cada audiência." },
          { icon: Wallet, t: "Recebes 80%", d: "Comissão clara e transparente. Acompanha os teus ganhos em tempo real." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-lg border border-border bg-card p-6">
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground md:px-12">
        <Sparkles className="mx-auto mb-2 h-4 w-4 text-primary" />
        © {new Date().getFullYear()} Xclusive. Plataforma 18+. Todo o conteúdo é responsabilidade dos seus criadores.
      </footer>
    </div>
  );
}
