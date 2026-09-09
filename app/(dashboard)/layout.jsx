import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// components
import Navbar from "../components/Navbar";

export default async function DashboardLayout({ children }) {
  const supabase = createServerComponentClient({ cookies });
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Session error:", error.message);
  }

  if (!data.session) {
    redirect("/login");
  }

  return (
    <>
      <Navbar user={data.session.user} />
      {children}
    </>
  );
}
