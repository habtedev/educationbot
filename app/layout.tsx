import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { TelegramProvider } from "./TelegramProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Educational Platform",
  description: "Learn Anytime. Learn Anywhere.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
