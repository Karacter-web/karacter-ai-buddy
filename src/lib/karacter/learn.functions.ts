import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { chatJson, readAiConfig } from "./ai.server";

export const learnFromConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        transcript: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .min(1)
          .max(20),
        known: z.array(z.string()).max(50).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Memory distillation is best-effort: a deployment without an AI key must
    // still let the conversation itself work.
    if (!readAiConfig()) return { saved: 0 };

    const system = `You extract durable, reusable facts about a user from an assistant conversation.
Only keep information that will still be true next week: names, nicknames, preferences, routines, tools, locations, constraints, style of address.
Never keep one-off task details, questions, secrets, passwords, card numbers or health diagnoses.
Skip anything already in KNOWN FACTS.
Respond ONLY with JSON: {"memories":[{"content":"...","category":"identity|preference|routine|tooling|general","confidence":0.0}]}
Return an empty array when nothing durable was said.`;

    let raw = "{}";
    try {
      raw = await chatJson([
        {
          role: "system",
          content: `${system}\n\nKNOWN FACTS:\n${data.known.map((k) => `- ${k}`).join("\n") || "(none)"}`,
        },
        {
          role: "user",
          content: data.transcript.map((t) => `${t.role}: ${t.content}`).join("\n"),
        },
      ]);
    } catch {
      return { saved: 0 };
    }

    let memories: Array<{ content?: string; category?: string; confidence?: number }> = [];
    try {
      const parsed = JSON.parse(raw) as {
        memories?: unknown;
      };
      if (Array.isArray(parsed.memories)) memories = parsed.memories.slice(0, 8);
    } catch {
      return { saved: 0 };
    }

    const rows = memories
      .filter((m) => typeof m.content === "string" && m.content.trim().length > 3)
      .map((m) => ({
        user_id: context.userId,
        content: m.content!.trim().slice(0, 300),
        category: typeof m.category === "string" ? m.category : "general",
        confidence: typeof m.confidence === "number" ? Math.min(1, Math.max(0, m.confidence)) : 0.6,
      }));

    if (!rows.length) return { saved: 0 };
    const { error } = await context.supabase.from("assistant_memories").insert(rows);
    if (error) throw error;
    return { saved: rows.length };
  });
