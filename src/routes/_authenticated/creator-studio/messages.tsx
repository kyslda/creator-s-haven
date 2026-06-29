import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/creator-studio/messages")({
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mensagens</h1>
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
        Mensagens privadas em breve.
      </div>
    </div>
  ),
});
