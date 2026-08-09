import { createFileRoute } from "@tanstack/react-router";

import { detectEnvironment } from "@/lib/karacter/gateway/config";
import { availableProviderIds } from "@/lib/karacter/gateway/router";

/**
 * Deployment self-check. Reports which AI providers are usable and whether
 * Supabase is bound — booleans and provider ids only, never values, so it is
 * safe on a public production domain.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const present = (name: string) => Boolean(process.env[name]);
        const environment = detectEnvironment();
        const providers = availableProviderIds();
        const supabase = present("SUPABASE_URL") && present("SUPABASE_PUBLISHABLE_KEY");

        return Response.json(
          {
            ok: providers.length > 0 && supabase,
            environment,
            checks: {
              ai_providers: providers,
              ai_ready: providers.length > 0,
              supabase_url: present("SUPABASE_URL"),
              supabase_publishable_key: present("SUPABASE_PUBLISHABLE_KEY"),
            },
            hint: providers.length
              ? undefined
              : environment === "production"
                ? "Set GEMINI_API_KEY (and optionally MISTRAL_API_KEY) as encrypted Worker secrets, then redeploy."
                : "Set LOVABLE_API_KEY for dev/preview, or GEMINI_API_KEY / MISTRAL_API_KEY.",
            time: new Date().toISOString(),
          },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
