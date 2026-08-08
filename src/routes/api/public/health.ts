import { createFileRoute } from "@tanstack/react-router";

/**
 * Deployment self-check. Returns only booleans — never values — so it is safe
 * to hit on a public production domain. Use it right after a Cloudflare deploy
 * to confirm the Worker actually received its environment variables.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const present = (name: string) => Boolean(process.env[name]);
        const ai = present("LOVABLE_API_KEY") || present("AI_GATEWAY_API_KEY");
        const supabase = present("SUPABASE_URL") && present("SUPABASE_PUBLISHABLE_KEY");

        return Response.json(
          {
            ok: ai && supabase,
            checks: {
              ai_gateway_key: ai,
              supabase_url: present("SUPABASE_URL"),
              supabase_publishable_key: present("SUPABASE_PUBLISHABLE_KEY"),
              supabase_service_role_key: present("SUPABASE_SERVICE_ROLE_KEY"),
            },
            hint: ai
              ? undefined
              : "Set LOVABLE_API_KEY as an encrypted secret on the Worker, then redeploy.",
            time: new Date().toISOString(),
          },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
