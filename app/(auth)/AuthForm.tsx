"use client";

import type { AuthSubmitHandler } from "@/types/auth";
import { useState } from "react";

interface AuthFormProps {
  handleSubmit: AuthSubmitHandler;
  busy: boolean;
}

export default function AuthForm({ handleSubmit, busy }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form onSubmit={(e) => handleSubmit(e, email, password)}>
      <label>
        <span>Email:</span>
        <input
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          required
        />
      </label>
      <label>
        <span>Password:</span>
        <input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          required
        />
      </label>
      <button className="btn-primary" disabled={busy}>{busy ? "Submitting..." : "Submit"}</button>
    </form>
  );
}
