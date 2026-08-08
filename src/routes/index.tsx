import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Send, Sparkles, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/karacter/AppShell";
import { AuthGate } from "@/components/karacter/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { planUtterance } from "@/lib/karacter/plan.functions";
import { learnFromConversation } from "@/lib/karacter/learn.functions";
import { executeIntent } from "@/lib/karacter/executor";
import { useCapabilities, useIntegrations } from "@/lib/karacter/registry";
import { speak, useVoice } from "@/lib/karacter/useVoice";
import { pushNotification } from "@/lib/karacter/notifications";
import { useConsents, useMemories, useProfile, personaSummary } from "@/lib/karacter/profile";
import { useWakeWord } from "@/lib/karacter/wakeword";
import {
  createConversation,
  saveMessage,
  useConversationMessages,
} from "@/lib/karacter/chat";
import type { ChatMessage, Intent } from "@/lib/karacter/types";
import { cn } from "@/lib/utils";

type IndexSearch = { c?: string | undefined };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    c: typeof search['c'] === "string" ? (search['c'] as string) : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Karacter AI — Voice Assistant with a Capability Registry" },
      {
        name: "description",
        content:
          "Karacter AI is a voice-first assistant that plans intents against a live capability registry and executes them through connected integrations.",
      },
      { property: "og:title", content: "Karacter AI — Voice Assistant with a Capability Registry" },
      {
        property: "og:description",
        content:
          "Speak or type an instruction. Karacter emits intents like open_app(camera) and your connected capabilities execute them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

/**
 * "/" is both the marketing page and the assistant: visitors get the landing
 * page, authenticated users get straight into Karacter with no redirect hop.
 */
function Home() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-10 animate-pulse rounded-full bg-primary/30" />
      </div>
    );
  }

  if (!session) return <Landing />;

  return (
    <AppShell>
      <Assistant />
    </AppShell>
  );
}


type Line = ChatMessage & { results?: string[] };

function Assistant() {
  const { c: conversationParam } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [conversationId, setConversationId] = useState<string | undefined>(conversationParam);
  const [messages, setMessages] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [voiceOut, setVoiceOut] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const plan = useServerFn(planUtterance);
  const learn = useServerFn(learnFromConversation);
  const { data: capabilities = [] } = useCapabilities();
  const { data: integrations = [] } = useIntegrations();
  const { data: stored } = useConversationMessages(conversationParam);
  const { data: profile = null } = useProfile();
  const { data: memories = [] } = useMemories();
  const { data: consents = [] } = useConsents();
  const learningOn = consents.some((c) => c.consent_key === "adaptive_learning" && c.granted);

  useEffect(() => {
    setConversationId(conversationParam);
    if (!conversationParam) setMessages([]);
  }, [conversationParam]);

  useEffect(() => {
    if (!conversationParam || !stored) return;
    setMessages(
      stored.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        intents: (message.intents ?? []) as Intent[],
        createdAt: message.created_at,
      })),
    );
  }, [conversationParam, stored]);

  const available = useMemo(
    () =>
      capabilities.filter((c) =>
        integrations.some((i) => i.capability_id === c.id && i.enabled),
      ),
    [capabilities, integrations],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const submit = useCallback(
    async (utterance: string) => {
      const text = utterance.trim().slice(0, 2000);
      if (!text || thinking) return;
      setInput("");
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
          intents: [],
          createdAt: new Date().toISOString(),
        },
      ]);
      setThinking(true);

      try {
        let activeId = conversationId;
        if (!activeId) {
          activeId = await createConversation(text);
          setConversationId(activeId);
          void navigate({ to: "/", search: { c: activeId }, replace: true });
        }
        await saveMessage({ conversationId: activeId, role: "user", content: text });

        const result = await plan({
          data: {
            utterance: text,
            persona: personaSummary(profile, memories),
            history,
            capabilities: available.map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              actions: (c.actions ?? []).map((a) => ({ name: a.name, description: a.description })),
            })),
          },
        });

        const intents = (result.intents ?? []) as Intent[];
        const results: string[] = [];

        for (const intent of intents) {
          const capability = capabilities.find((c) => c.id === intent.capability);
          const integration = integrations.find((i) => i.capability_id === intent.capability);
          const execution = await executeIntent(intent, { capability, integration });
          results.push(`${intent.capability}.${intent.action} → ${execution.detail}`);
          pushNotification({
            title: `${intent.capability}.${intent.action}`,
            body: execution.detail,
            level: execution.status === "done" ? "success" : "error",
          });
          await supabase.from("intent_logs").insert({
            capability_id: intent.capability,
            action: intent.action,
            args: (intent.args ?? {}) as never,
            status: execution.status,
            result: execution.detail,
          });
        }

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.speech,
            intents,
            results,
            createdAt: new Date().toISOString(),
          },
        ]);
        await saveMessage({
          conversationId: activeId,
          role: "assistant",
          content: result.speech,
          intents,
        });
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        speak(result.speech, voiceOut);

        if (learningOn) {
          void learn({
            data: {
              transcript: [
                ...history,
                { role: "user" as const, content: text },
                { role: "assistant" as const, content: result.speech },
              ].slice(-10),
              known: memories.slice(0, 40).map((m) => m.content),
            },
          })
            .then((r) => {
              if (r.saved > 0) void queryClient.invalidateQueries({ queryKey: ["memories"] });
            })
            .catch(() => undefined);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Karacter could not respond";
        toast.error(detail);
        pushNotification({ title: "Karacter error", body: detail, level: "error" });
      } finally {
        setThinking(false);
      }
    },
    [
      available,
      capabilities,
      conversationId,
      integrations,
      learn,
      learningOn,
      memories,
      messages,
      navigate,
      plan,
      profile,
      queryClient,
      thinking,
      voiceOut,
    ],
  );

  const greet = useCallback(() => {
    const name = profile?.nickname || profile?.display_name || "";
    const greeting = name ? `Hmm, hi there ${name} — what can I do for you?` : "Hmm, hi there — what can I do for you?";
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: greeting,
        intents: [],
        createdAt: new Date().toISOString(),
      },
    ]);
    speak(greeting, voiceOut);
  }, [profile, voiceOut]);

  const { listening, supported, start, stop } = useVoice((transcript) => void submit(transcript));

  useWakeWord({
    enabled: Boolean(profile?.wake_word_enabled),
    wakeWord: profile?.wake_word ?? "hey karacter",
    paused: listening || thinking,
    onWake: (remainder) => {
      if (remainder) void submit(remainder);
      else {
        greet();
        start();
      }
    },
  });




  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-4 pt-4 text-center">
        <button
          onClick={() => (listening ? stop() : start())}
          aria-label={listening ? "Stop listening" : "Start listening"}
          className={cn(
            "relative grid size-28 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/40 transition-all",
            listening && "scale-105 bg-primary/20 ring-2 ring-primary",
          )}
        >
          {listening && <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />}
          {supported ? <Mic className="size-9" /> : <MicOff className="size-9" />}
        </button>
        <div>
          <p className="text-sm font-medium">
            {listening ? "Listening…" : thinking ? "Thinking…" : profile?.wake_word_enabled ? `Say “${profile.wake_word}” or tap to speak` : "Tap to speak"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {available.length} capabilit{available.length === 1 ? "y" : "ies"} connected
            {supported ? "" : " · voice input unsupported in this browser"}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 size-5 text-primary" />
            Try “open camera”, “search for flight prices to Lagos”, or “what capabilities do you
            have?”
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
              message.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start border border-border bg-card",
            )}
          >
            <p>{message.content}</p>
            {message.intents?.length > 0 && (
              <ul className="mt-3 space-y-1">
                {message.intents.map((intent, index) => (
                  <li key={index} className="rounded-lg bg-secondary/60 px-2 py-1 font-mono text-[11px]">
                    {intent.capability}.{intent.action}(
                    {Object.entries(intent.args ?? {})
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(", ")}
                    )
                    {message.results?.[index] && (
                      <span className="block text-muted-foreground">{message.results[index]}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(input);
        }}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 p-3 backdrop-blur"
      >
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type an instruction…"
            aria-label="Instruction"
            maxLength={2000}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => setVoiceOut(!voiceOut)}>
            {voiceOut ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </Button>
          <Button type="submit" size="icon" disabled={thinking}>
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
