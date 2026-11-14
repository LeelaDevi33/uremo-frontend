import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

import { ToastProvider } from "@/hooks/useToast";
import ToastViewport from "@/components/ToastViewport";
import SiteFrame from "@/components/SiteFrame";

const inter = localFont({
  src: "../public/fonts/inter/InterVariable.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
});

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
          <SiteFrame>{children}</SiteFrame>
          <ToastViewport />
        </ToastProvider>
      </body>
    </html>
  );
}
