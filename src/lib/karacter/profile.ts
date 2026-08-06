import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  user_id: string;
  display_name: string;
  nickname: string;
  gender: string;
  age: number | null;
  avatar_url: string;
  locale: string;
  wake_word: string;
  wake_word_enabled: boolean;
  require_voice_match: boolean;
  require_face_match: boolean;
  lock_on_mismatch: boolean;
  onboarding_completed: boolean;
};

export type BiometricEnrollment = {
  id: string;
  kind: "voice" | "face";
  label: string;
  signature: number[];
  samples: number;
  updated_at: string;
};

export type AssistantMemory = {
  id: string;
  content: string;
  category: string;
  confidence: number;
  created_at: string;
};

export type ConsentRecord = { consent_key: string; granted: boolean; updated_at: string };

export const CONSENTS = [
  {
    key: "biometric_processing",
    label: "Biometric identity verification",
    description:
      "Store a mathematical voice and face signature (never raw recordings or photos) so only you can activate Karacter.",
    required: false,
  },
  {
    key: "conversation_storage",
    label: "Conversation history",
    description: "Keep your chats so you can revisit past sessions from History.",
    required: true,
  },
  {
    key: "adaptive_learning",
    label: "Continuous improvement",
    description:
      "Let Karacter learn durable facts and preferences from your conversations to personalise future answers.",
    required: false,
  },
  {
    key: "activity_logging",
    label: "Activity audit log",
    description: "Record which capability actions ran, so you can audit and revoke them.",
    required: false,
  },
] as const;

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Profile | null;
    },
  });
}

export async function saveProfile(patch: Partial<Profile>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: auth.user.id, ...patch } as never, { onConflict: "user_id" });
  if (error) throw error;
}

export function useBiometrics() {
  return useQuery({
    queryKey: ["biometrics"],
    queryFn: async (): Promise<BiometricEnrollment[]> => {
      const { data, error } = await supabase.from("biometric_enrollments").select("*");
      if (error) throw error;
      return (data ?? []) as unknown as BiometricEnrollment[];
    },
  });
}

export async function saveBiometric(kind: "voice" | "face", signature: number[], label: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data: existing } = await supabase
    .from("biometric_enrollments")
    .select("id, samples")
    .eq("kind", kind)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("biometric_enrollments")
      .update({ signature: signature as never, samples: (existing.samples ?? 1) + 1, label })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("biometric_enrollments")
    .insert({ kind, label, signature: signature as never, samples: 1, user_id: auth.user.id });
  if (error) throw error;
}

export async function deleteBiometric(kind: "voice" | "face") {
  const { error } = await supabase.from("biometric_enrollments").delete().eq("kind", kind);
  if (error) throw error;
}

export function useConsents() {
  return useQuery({
    queryKey: ["consents"],
    queryFn: async (): Promise<ConsentRecord[]> => {
      const { data, error } = await supabase.from("consent_records").select("*");
      if (error) throw error;
      return (data ?? []) as unknown as ConsentRecord[];
    },
  });
}

export async function setConsent(consentKey: string, granted: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { error } = await supabase.from("consent_records").upsert(
    {
      user_id: auth.user.id,
      consent_key: consentKey,
      granted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,consent_key" },
  );
  if (error) throw error;
}

export function useMemories() {
  return useQuery({
    queryKey: ["memories"],
    queryFn: async (): Promise<AssistantMemory[]> => {
      const { data, error } = await supabase
        .from("assistant_memories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AssistantMemory[];
    },
  });
}

export async function deleteMemory(id: string) {
  const { error } = await supabase.from("assistant_memories").delete().eq("id", id);
  if (error) throw error;
}

/** Compact persona string injected into the planner prompt. */
export function personaSummary(profile: Profile | null, memories: AssistantMemory[]): string {
  if (!profile) return "";
  const bits = [
    profile.nickname && `Call the user "${profile.nickname}".`,
    profile.display_name && `Full name: ${profile.display_name}.`,
    profile.gender && `Gender: ${profile.gender}.`,
    profile.age && `Age: ${profile.age}.`,
  ].filter(Boolean);
  const learned = memories.slice(0, 25).map((m) => `- ${m.content}`);
  return [
    bits.length ? `USER PROFILE:\n${bits.join(" ")}` : "",
    learned.length ? `LEARNED PREFERENCES:\n${learned.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
