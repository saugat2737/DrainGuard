import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DrainGuard — Urban Waterlogging & Drain Risk",
  description: "Street-level rain warnings for citizens + ranked inspection queue for the municipality.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
