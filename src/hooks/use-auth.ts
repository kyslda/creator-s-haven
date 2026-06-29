import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "user" | "creator" | "admin";

export interface AuthUser extends User {
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    credits: number;
    is_banned: boolean;
  };
  roles?: Role[];
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // Defer the profile/role fetch to avoid potential deadlocks
        setTimeout(() => loadProfile(s.user), 0);
      } else {
        setUser(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user);
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(u: User) {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("username, display_name, avatar_url, credits, is_banned").eq("id", u.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.id),
    ]);
    setUser({
      ...u,
      profile: profile ?? undefined,
      roles: (roles?.map((r) => r.role) ?? []) as Role[],
    });
    setLoading(false);
  }

  return { session, user, loading };
}

export function hasRole(user: AuthUser | null, role: Role) {
  return !!user?.roles?.includes(role);
}
