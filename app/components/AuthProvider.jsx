"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, reload, getIdToken } from "firebase/auth";
import { getFirebase } from "@/utils/firebase/client";

const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [session, setSession] = useState({ user: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    let unsubscribe;
    // Defer browser initialization until after mount and handle configuration errors.
    Promise.resolve().then(() => {
      if (!active) return;
      unsubscribe = onIdTokenChanged(getFirebase().auth, (user) => {
        if (active) setSession({ user, loading: false, error: "" });
      }, (error) => {
        if (active) setSession({ user: null, loading: false, error: error.message });
      });
    }).catch((error) => {
      if (active) setSession({ user: null, loading: false, error: error.message });
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

export function useAuth() {
  return useContext(AuthContext);
}
