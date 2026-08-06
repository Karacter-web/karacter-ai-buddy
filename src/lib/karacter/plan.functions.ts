import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PlanInput = z.object({
  utterance: z.string().min(1).max(2000),
  persona: z.string().max(4000).default(""),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .default([]),
  capabilities: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        actions: z.array(z.object({ name: z.string(), description: z.string() })),
      }),
    )
    .max(50)
    .default([]),
});

const SYSTEM = `You are Karacter AI, a voice assistant brain.
You never perform actions yourself. You decide WHICH capability + action should run, and the host runtime executes it.

Rules:
- Only emit intents for capabilities listed in the CAPABILITY REGISTRY below. Never invent a capability or action.
- If the user asks for something no available capability covers, emit no intents and say plainly that the capability is not connected yet, naming what they would need to connect in Integrations.
- Keep "speech" short, natural and spoken-aloud friendly (1-2 sentences).
- Emit multiple intents only when the request genuinely needs several steps.

Respond ONLY with JSON of the shape:
{"speech":"...","intents":[{"capability":"<id>","action":"<action name>","args":{...},"reason":"short"}]}`;

export const planUtterance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const registry = data.capabilities.length
      ? data.capabilities
          .map(
            (c) =>
              `- ${c.id} (${c.name}): ${c.description}\n  actions: ${c.actions
                .map((a) => `${a.name} — ${a.description}`)
                .join("; ")}`,
          )
          .join("\n")
      : "(no capabilities connected)";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${SYSTEM}\n\nCAPABILITY REGISTRY:\n${registry}` },
          ...data.history,
          { role: "user", content: data.utterance },
        ],
      }),
    });

    if (response.status === 429) throw new Error("Karacter is rate limited. Try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    if (!response.ok) throw new Error(`AI gateway error ${response.status}: ${await response.text()}`);

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";

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
