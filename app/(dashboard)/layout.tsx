"use client";

import type { ChildrenProps } from "@/types/components";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import Navbar from "../components/Navbar";
import Loading from "./loading";

export default function DashboardLayout({ children }: ChildrenProps) {
  const { user, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !error) {
      if (!user) router.replace("/login");
      else if (!user.emailVerified) router.replace("/verify");
    }
  }, [user, loading, error, router]);

  if (error) return <main><div className="error">{error}</div></main>;
  if (loading || !user || !user.emailVerified) return <Loading />;
  return <><Navbar user={user} />{children}</>;
}
