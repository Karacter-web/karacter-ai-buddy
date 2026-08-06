import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Permanently erase every trace of the signed-in user, then their auth record. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tables = [
      "messages",
      "conversations",
      "intent_logs",
      "integrations",
      "biometric_enrollments",
      "assistant_memories",
      "user_preferences",
      "consent_records",
      "permission_grants",
      "profiles",
    ] as const;

    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) throw new Error(`Failed clearing ${table}: ${error.message}`);
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Machine-readable export of everything Karacter stores about the user. */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tables = [
      "profiles",
      "conversations",
      "messages",
      "intent_logs",
      "integrations",
      "assistant_memories",
      "user_preferences",
      "consent_records",
      "permission_grants",
    ] as const;

    const bundle: Record<string, unknown> = { exported_at: new Date().toISOString() };
    for (const table of tables) {
      const { data } = await context.supabase.from(table).select("*");
      bundle[table] = data ?? [];
    }
    return bundle;
  });
