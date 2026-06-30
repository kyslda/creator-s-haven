import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Wallet, MessageSquare, Home, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCreator = hasRole(user, "creator") || hasRole(user, "admin");

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Sessão terminada");
    navigate({ to: "/" });
  }

  const nav = [
    { to: "/feed", label: "Feed", icon: Home },
    { to: "/messages", label: "Mensagens", icon: MessageSquare },
    { to: "/wallet", label: "Carteira", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <Link to="/feed" className="text-lg font-bold">X<span className="text-primary">clusive</span></Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname.startsWith(to);
              return (
                <Link key={to} to={to as any}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/wallet" className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm sm:flex">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-semibold">{user?.profile?.credits ?? 0}</span>
              <span className="text-muted-foreground">créd.</span>
            </Link>
            {isCreator && (
              <Link to="/creator-studio" className="hidden rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground md:inline-flex md:items-center md:gap-2">
                <LayoutDashboard className="h-4 w-4" /> Studio
              </Link>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {user?.profile?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground" title="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="flex gap-1 border-t border-border px-2 py-1 md:hidden">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to as any}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium ${active ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10 animate-fade-in">{children}</main>
    </div>
  );
}
