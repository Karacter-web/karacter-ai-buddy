import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Intent } from "./types";

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type StoredMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  intents: Intent[];
  created_at: string;
};

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Conversation[];
    },
  });
}

export function useConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["messages", conversationId],
    enabled: Boolean(conversationId),
    queryFn: async (): Promise<StoredMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as StoredMessage[];
    },
  });
}

export async function createConversation(title: string): Promise<string> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title: title.slice(0, 80) || "New conversation" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function saveMessage(input: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  intents?: Intent[];
}) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: input.conversationId,
    role: input.role,
    content: input.content,
    intents: (input.intents ?? []) as never,
  });
  if (error) throw error;
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.conversationId);
}

export async function deleteConversation(id: string) {
  await supabase.from("messages").delete().eq("conversation_id", id);
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}
