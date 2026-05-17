import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Reedy", template: "%s · Reedy" },
  description: "Track what you're reading and see it at your local NYC library",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 antialiased">
        <Navbar />
        <main className="pb-16 sm:pb-0">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
