import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Upload, FileImage, Users, MessageSquare, DollarSign, Settings, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/creator-studio")({
  component: StudioLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/creator-studio", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/creator-studio/upload", label: "Publicar", icon: Upload },
  { to: "/creator-studio/posts", label: "Minhas publicações", icon: FileImage },
  { to: "/creator-studio/subscribers", label: "Subscritores", icon: Users },
  { to: "/creator-studio/messages", label: "Mensagens", icon: MessageSquare },
  { to: "/creator-studio/earnings", label: "Ganhos", icon: DollarSign },
  { to: "/creator-studio/settings", label: "Definições", icon: Settings },
];

function StudioLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Sessão terminada");
    navigate({ to: "/" });
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">A carregar estúdio...</div>;
  }

  const isCreator = hasRole(user, "creator") || hasRole(user, "admin");
  if (!isCreator) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">Acesso restrito a criadores</h1>
          <p className="mt-2 text-sm text-muted-foreground">A tua conta é de utilizador. Contacta o suporte para te tornares criador.</p>
          <Link to="/" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const isActive = (to: string, exact?: boolean) => exact ? pathname === to : pathname.startsWith(to);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar (desktop) + mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-sidebar-border bg-sidebar transition-transform md:static md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/" className="text-lg font-bold">X<span className="text-primary">clusive</span></Link>
          <button className="md:hidden text-muted-foreground" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {nav.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-primary/15 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3">
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-8">
          <button className="md:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden text-right md:block">
              <div className="text-sm font-semibold">{user?.profile?.display_name ?? user?.profile?.username}</div>
              <div className="text-xs text-muted-foreground">@{user?.profile?.username}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {user?.profile?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
