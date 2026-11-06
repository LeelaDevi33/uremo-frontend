import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { ToastProvider } from "@/hooks/useToast";
import ToastViewport from "@/components/ToastViewport";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const FAVICON_PATH = "/brand/icon.png";

export const metadata: Metadata = {
  title: {
    default: "UREMO",
    template: "%s | UREMO",
  },
  description: "Browse project opportunities, apply to open roles and manage your project access.",
  icons: {
    icon: FAVICON_PATH,
    shortcut: FAVICON_PATH,
    apple: FAVICON_PATH,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ToastProvider>
          <Navbar />
          <main className="pt-14">{children}</main>
          <ToastViewport />
        </ToastProvider>
      </body>
    </html>
  );
}
