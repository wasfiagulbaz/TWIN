import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { FREE_SEARCH_LIMIT, supabase } from "../lib/supabase";

const AuthContext = createContext(null);

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function mapUser(sessionUser, profile) {
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: profile?.name || sessionUser.user_metadata?.name || "",
    marketplace: profile?.marketplace || "",
    search_count: profile?.search_count ?? 0,
    subscription_status: profile?.subscription_status || "free",
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session?.user) {
      setUser(null);
      return;
    }

    try {
      const profile = await fetchProfile(session.user.id);
      setUser(mapUser(session.user, profile));
    } catch {
      setUser(mapUser(session.user, null));
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      await loadSession();
      if (mounted) {
        setIsLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }

      try {
        const profile = await fetchProfile(session.user.id);
        setUser(mapUser(session.user, profile));
      } catch {
        setUser(mapUser(session.user, null));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadSession]);

  const signup = async ({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name: name.trim() },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("Signup failed. Please try again.");
    }

    if (data.session) {
      const profile = await fetchProfile(data.user.id);
      const nextUser = mapUser(data.user, profile);
      setUser(nextUser);
      return nextUser;
    }

    throw new Error(
      "Check your email to confirm your account, then log in."
    );
  };

  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const profile = await fetchProfile(data.user.id);
    const nextUser = mapUser(data.user, profile);
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateProfile = async (updates) => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        name: updates.name,
        marketplace: updates.marketplace,
      })
      .eq("id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    setUser((previous) => ({ ...previous, ...updates }));
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session?.user) {
      setUser(null);
      return;
    }

    const profile = await fetchProfile(session.user.id);
    setUser(mapUser(session.user, profile));
  };

  const isPremium = user?.subscription_status === "premium";
  const searchesRemaining = isPremium
    ? null
    : Math.max(0, FREE_SEARCH_LIMIT - (user?.search_count ?? 0));
  const canSearch =
    isPremium || (user?.search_count ?? 0) < FREE_SEARCH_LIMIT;

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    isPremium,
    searchesRemaining,
    canSearch,
    freeSearchLimit: FREE_SEARCH_LIMIT,
    signup,
    login,
    logout,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
