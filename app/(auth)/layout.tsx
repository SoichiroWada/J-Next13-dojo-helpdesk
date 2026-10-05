"use client";

import type { ChildrenProps } from "@/types/components";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

export default function AuthLayout({ children }: ChildrenProps) {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !error && user) {
      if (user.emailVerified) router.replace("/");
      else if (pathname !== "/verify") router.replace("/verify");
    }
  }, [user, loading, error, pathname, router]);

  return (
    <>
      <nav>
        <h1>Dojo Helpdesk</h1>
        <Link href="/signup">Sign up</Link>
        <Link href="/login">Login</Link>
      </nav>
      {error ? <main><div className="error">{error}</div></main> :
        loading ? <main className="text-center"><h2>Loading...</h2></main> :
        user && (user.emailVerified || pathname !== "/verify") ? null : children}
    </>
  );
}
