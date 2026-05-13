import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/s/$spaceId/")({
  component: () => <div className="p-8 text-muted-foreground">Loading channels…</div>,
});