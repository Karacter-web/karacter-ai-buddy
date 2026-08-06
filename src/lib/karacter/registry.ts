import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Capability, Integration } from "./types";

export function useCapabilities() {
  return useQuery({
    queryKey: ["capabilities"],
    queryFn: async (): Promise<Capability[]> => {
      const { data, error } = await supabase.from("capabilities").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Capability[];
    },
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: async (): Promise<Integration[]> => {
      const { data, error } = await supabase.from("integrations").select("*");
      if (error) throw error;
      return (data ?? []) as unknown as Integration[];
    },
  });
}
