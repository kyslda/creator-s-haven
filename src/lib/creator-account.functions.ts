import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requestCreatorAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ error: roleError }, { error: profileError }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: context.userId, role: "creator" }, { onConflict: "user_id,role" }),
      supabaseAdmin
        .from("creator_profiles")
        .upsert({ user_id: context.userId, is_approved: false }, { onConflict: "user_id" }),
    ]);

    if (roleError) throw roleError;
    if (profileError) throw profileError;

    return { ok: true };
  });