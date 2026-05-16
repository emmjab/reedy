import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: { default: "Reedy", template: "%s · Reedy" },
  description: "Track what you're reading and see it at your local NYC library",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
