import type { User } from "firebase/auth";
import type { FormEvent } from "react";

export interface AuthSession {
  user: User | null;
  loading: boolean;
  error: string;
}

export interface AuthContextValue extends AuthSession {
  refreshUser: () => Promise<User | null>;
}

export type AuthSubmitHandler = (
  event: FormEvent<HTMLFormElement>,
  email: string,
  password: string
) => Promise<void>;
