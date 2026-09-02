import React from "react";
import Link from "next/link";
import Image from "next/image";
import Logo from "./dojo-logo.png";

export default function Navbar() {
  return (
    <nav>
      <Link href="/">
        <Image
          src={Logo}
          alt="Dojo Helpdesk logo"
          width={70}
          placeholder="blur"
          quality={100}
        />
      </Link>
      <h1>Dojo Helpdesk</h1>
      <Link href="/">Dashboard</Link>
      <Link href="/tickets">Tickets</Link>
    </nav>
  );
}
