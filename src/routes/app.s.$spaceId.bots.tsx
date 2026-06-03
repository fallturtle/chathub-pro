import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";

export const Route = createFileRoute("/app/s/$spaceId/bots")({
  component: BotsPage,
});

function BotsPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6" /> Bots</h1>
      <p className="text-muted-foreground mt-2">
        Full Discord-style bots (slash commands, event listeners, permissions, hosted runtime) are coming in a future update.
      </p>
      <p className="text-muted-foreground mt-2">
        Today you can already use <strong>Webhooks</strong> to let external services post into a channel as a named bot user — that's in the <em>Webhooks</em> section.
      </p>
    </div>
  );
}