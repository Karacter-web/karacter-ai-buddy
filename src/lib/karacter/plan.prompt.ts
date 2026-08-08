import { z } from "zod";

/**
 * Runtime siblings of a `createServerFn` module get stripped during the
 * server-function split, which is how a planner that works in dev can throw a
 * ReferenceError in the deployed Worker. Keeping the schema and system prompt
 * in a plain module makes them survive the build.
 */
export const PlanInput = z.object({
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

export type PlanInputData = z.infer<typeof PlanInput>;

export const PLAN_SYSTEM = `You are Karacter AI, a voice assistant brain.
You never perform actions yourself. You decide WHICH capability + action should run, and the host runtime executes it.

Rules:
- Only emit intents for capabilities listed in the CAPABILITY REGISTRY below. Never invent a capability or action.
- If the user asks for something no available capability covers, emit no intents and say plainly that the capability is not connected yet, naming what they would need to connect in Integrations.
- Keep "speech" short, natural and spoken-aloud friendly (1-2 sentences).
- Emit multiple intents only when the request genuinely needs several steps.
- When no capability is involved, just answer the user conversationally in "speech" with an empty intents array.

Respond ONLY with JSON of the shape:
{"speech":"...","intents":[{"capability":"<id>","action":"<action name>","args":{...},"reason":"short"}]}`;

export function formatRegistry(capabilities: PlanInputData["capabilities"]) {
  if (!capabilities.length) return "(no capabilities connected)";
  return capabilities
    .map(
      (c) =>
        `- ${c.id} (${c.name}): ${c.description}\n  actions: ${c.actions
          .map((a) => `${a.name} — ${a.description}`)
          .join("; ")}`,
    )
    .join("\n");
}
