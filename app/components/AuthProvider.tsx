"use client";

import type { AuthContextValue, AuthSession } from "@/types/auth";
import type { Unsubscribe } from "firebase/auth";
import type { ChildrenProps } from "@/types/components";
import { getErrorMessage } from "@/utils/errors";
import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, reload, getIdToken } from "firebase/auth";
import { getFirebase } from "@/utils/firebase/client";

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: ChildrenProps) {
  const [session, setSession] = useState<AuthSession>({ user: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    let unsubscribe: Unsubscribe | undefined;
    // Defer browser initialization until after mount and handle configuration errors.
    Promise.resolve().then(() => {
      if (!active) return;
      unsubscribe = onIdTokenChanged(getFirebase().auth, (user) => {
        if (active) setSession({ user, loading: false, error: "" });
      }, (error) => {
        if (active) setSession({ user: null, loading: false, error: getErrorMessage(error) });
      });
    }).catch((error) => {
      if (active) setSession({ user: null, loading: false, error: getErrorMessage(error) });
    });
    return () => { active = false; unsubscribe?.(); };
  }, []);

  async function refreshUser() {
    const user = getFirebase().auth.currentUser;
    if (user) {
      await reload(user);
      await getIdToken(user, true);
    }
    setSession({ user, loading: false, error: "" });
    return user;
  }

  return (
    <AuthContext.Provider value={{ ...session, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// All consumers are rendered inside the root AuthProvider.
export function useAuth(): AuthContextValue {
  return useContext(AuthContext)!;
}
