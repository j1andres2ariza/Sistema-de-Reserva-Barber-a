import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [checkedUser, setCheckedUser] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const apply = (next: User | null) => {
      if (mounted) {
        setUser(next);
        setInitializing(false);
      }
    };
    void supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session?.user ?? null))
      .catch(() => apply(null));
    // Keep this callback synchronous; calling Supabase queries inside it can deadlock auth refresh.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      apply(session?.user ?? null),
    );
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  const userId = user?.id;
  useEffect(() => {
    let mounted = true;
    setAdminUser(null);
    setCheckedUser(null);
    if (userId)
      void supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle()
        .then(({ data }) => {
          if (mounted) {
            setAdminUser(data ? userId : null);
            setCheckedUser(userId);
          }
        });
    return () => {
      mounted = false;
    };
  }, [userId]);
  return {
    user,
    loading: initializing || Boolean(user && checkedUser !== user.id),
    isAdmin: Boolean(user && adminUser === user.id),
    signIn: async (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),
    signOut: async () => {
      await supabase.auth.signOut();
      setAdminUser(null);
      setUser(null);
    },
  };
}
