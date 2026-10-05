"use client";

import { getErrorMessage } from "@/utils/errors";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "../../components/AuthProvider";
import LogoutButton from "../../components/LogoutButton";

export default function Verify() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleVerification(resend: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const current = await refreshUser();
      if (!current) {
        router.replace("/login");
      } else if (current.emailVerified) {
        router.replace("/");
      } else if (resend) {
        await sendEmailVerification(current, { url: window.location.origin + "/login" });
        setMessage("Verification email sent. Check your inbox.");
      } else {
        setMessage("Your email has not been verified yet. Open the link in your inbox, then check again.");
      }
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="text-center">
      <h2>Thanks for registering!</h2>
      <p>Before logging in, you need to verify your email address.</p>
      {user && <div className="flex justify-center gap-5 my-8">
        <button className="btn-primary" disabled={busy} onClick={() => handleVerification(false)}>I&apos;ve verified my email</button>
        <button className="btn-secondary" disabled={busy} onClick={() => handleVerification(true)}>Resend verification email</button>
        <LogoutButton />
      </div>}
      {message && <p role="status">{message}</p>}
      {error && <div className="error">{error}</div>}
    </main>
  );
}
