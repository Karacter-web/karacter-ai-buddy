import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for auth state.
 *
 * Hardening notes:
 * - the listener is registered BEFORE the initial getSession() so no event is missed;
 * - `loading` only flips false once, and never flips back true on a token refresh,
 *   so the app never bounces back to a spinner mid-session;
 * - a late-resolving getSession() can no longer overwrite a newer event.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const settled = useRef(false);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      settled.current = true;
      setSession(next);
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active || settled.current) return;
      settled.current = true;
      setSession(data.session);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}
