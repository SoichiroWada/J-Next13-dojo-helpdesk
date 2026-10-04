import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import { Rubik } from "next/font/google";

const rubik = Rubik({ subsets: ["latin"] })

export const metadata = {
  title: "Dojo Helpdesk",
  description: "Dojo Helpdesk",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={rubik.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
