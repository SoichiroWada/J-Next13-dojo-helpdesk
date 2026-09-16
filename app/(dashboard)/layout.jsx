// import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
// import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// components
import Navbar from "../components/Navbar";

export default async function DashboardLayout({ children }) {
  // const supabase = createServerComponentClient({ cookies });
  // const { data, error } = await supabase.auth.getSession();
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Session error:", error.message);
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Navbar user={user} />
      {children}
    </>
  );
}
