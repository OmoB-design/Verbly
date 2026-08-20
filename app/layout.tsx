import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Verbly",
    template: "%s · Verbly",
  },
  description:
    "Warm, guided speech and language practice for families — a personalised starting point, daily activities, and progress you can share with your SLP. Not a substitute for professional evaluation.",
  applicationName: "Verbly",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#211f1a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
