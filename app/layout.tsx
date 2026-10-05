import type { ChildrenProps } from "@/types/components";
import "./globals.css";
import type { Metadata } from "next";
import AuthProvider from "./components/AuthProvider";
import { Rubik } from "next/font/google";

const rubik = Rubik({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dojo Helpdesk",
  description: "Dojo Helpdesk",
};

export default function RootLayout({ children }: ChildrenProps) {
  return (
    <html lang="en">
      <body className={rubik.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
