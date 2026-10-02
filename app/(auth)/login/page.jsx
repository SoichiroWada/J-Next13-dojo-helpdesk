"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebase } from "@/utils/firebase/client";
import AuthForm from "../AuthForm";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e, email, password) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { user } = await signInWithEmailAndPassword(getFirebase().auth, email, password);
      router.replace(user.emailVerified ? "/" : "/verify");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h2 className="text-center">Login</h2>
      <AuthForm handleSubmit={handleSubmit} busy={busy} />
      {error && <div className="error">{error}</div>}
    </main>
  );
}
