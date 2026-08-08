import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatJson } from "./ai.server";
import { PLAN_SYSTEM, PlanInput, formatRegistry } from "./plan.prompt";

export const planUtterance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data }) => {
    const raw = await chatJson([
      {
        role: "system",
        content: `${PLAN_SYSTEM}\n\nCAPABILITY REGISTRY:\n${formatRegistry(data.capabilities)}${
          data.persona ? `\n\n${data.persona}` : ""
        }`,
      },
      ...data.history,
      { role: "user", content: data.utterance },
    ]);

    try {
      const parsed = JSON.parse(raw) as { speech?: string; intents?: unknown };
      return {
        speech: typeof parsed.speech === "string" ? parsed.speech : "Done.",
        intents: Array.isArray(parsed.intents) ? parsed.intents : [],
      };
    } catch {
      return { speech: raw.slice(0, 500), intents: [] };
    }
  });
