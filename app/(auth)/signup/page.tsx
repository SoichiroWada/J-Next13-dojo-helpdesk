"use client";

import type { AuthSubmitHandler } from "@/types/auth";
import { getErrorMessage } from "@/utils/errors";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getFirebase } from "@/utils/firebase/client";
import AuthForm from "../AuthForm";

export default function Signup() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit: AuthSubmitHandler = async (e, email, password) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { user } = await createUserWithEmailAndPassword(getFirebase().auth, email, password);
      await sendEmailVerification(user, { url: window.location.origin + "/login" });
      router.replace("/verify");
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h2 className="text-center">Sign up</h2>
      <AuthForm handleSubmit={handleSubmit} busy={busy} />
      {error && <div className="error">{error}</div>}
    </main>
  );
}
