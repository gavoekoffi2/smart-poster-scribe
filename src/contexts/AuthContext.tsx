import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isRealUser: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAnonUser = (u: User | null) =>
  !!u && ((u as any).is_anonymous === true || u.app_metadata?.provider === "anonymous");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ensuringAnon = false;

    const ensureAnonSession = async () => {
      if (ensuringAnon) return;
      ensuringAnon = true;
      try {
        await supabase.auth.signInAnonymously();
      } catch (e) {
        console.error("Anonymous sign-in failed:", e);
      } finally {
        ensuringAnon = false;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (!session && event !== "SIGNED_OUT") {
        ensureAnonSession();
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        await ensureAnonSession();
        const { data: { session: newSession } } = await supabase.auth.getSession();
        setSession(newSession);
        setUser(newSession?.user ?? null);
      } else {
        setSession(session);
        setUser(session.user);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const anonymous = isAnonUser(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        isAnonymous: anonymous,
        isRealUser: !!user && !anonymous,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
