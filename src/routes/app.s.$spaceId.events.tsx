import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/s/$spaceId/events")({
  component: () => (
    <div className="p-8 text-muted-foreground">
      <h1 className="text-xl font-bold mb-2 text-foreground">Events</h1>
      <p>Calendar and event RSVPs coming in the next pass — backend is ready.</p>
    </div>
  ),
});