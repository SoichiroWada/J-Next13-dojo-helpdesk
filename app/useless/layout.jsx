import Link from "next/link";
import Navbar from "@/app/components/Navbar";

export default function AuthLayout({ children }) {
  return (
    <>
      <nav>
        <Link href="/">
          <h1>Dojo Helpdesk</h1>
        </Link>
        <Link href="/signup">Sign up</Link>
        <Link href="/login">Login</Link>
      </nav>
      <Navbar></Navbar>
      {children}
    </>
  );
}
