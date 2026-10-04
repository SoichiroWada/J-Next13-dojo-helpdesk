"use client";

import { getErrorMessage } from "@/utils/errors";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getFirebase } from "@/utils/firebase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await signOut(getFirebase().auth);
      router.replace("/login");
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return <><button className="btn-primary" onClick={handleLogout} disabled={busy}>Logout</button>
    {error && <div className="error">{error}</div>}</>;
}
