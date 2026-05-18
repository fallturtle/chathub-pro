import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/s/$spaceId/bot")({
  component: () => (
    <div className="p-8 text-muted-foreground">
      <h1 className="text-xl font-bold mb-2 text-foreground">Bot integration</h1>
      <p>Bots will be added in a later version.</p>
    </div>
  ),
});