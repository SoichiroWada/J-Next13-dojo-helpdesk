// import Link from "next/link";
// import { cookies } from "next/headers";
// import { redirect } from "next/navigation";
// import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

// export default async function AuthLayout({ children }) {
//   const supabase = createServerComponentClient({ cookies });
//   const { data } = await supabase.auth.getSession();

//   if (data.session) {
//     redirect("/");
//   }

//   return (
//     <>
//       <nav>
//         <h1>Dojo Helpdesk</h1>
//         <Link href="/signup">Sign up</Link>
//         <Link href="/login">Login</Link>
//       </nav>
//       {children}
//     </>
//   );
// }

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function AuthLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <>
      <nav>
        <h1>Dojo Helpdesk</h1>
        <Link href="/signup">Sign up</Link>
        <Link href="/login">Login</Link>
      </nav>

      {children}
    </>
  );
}
