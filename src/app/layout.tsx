import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0B1220",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "DrainGuard — Urban Waterlogging & Drain Risk Intelligence",
  description: "Street-level rain warnings for citizens + ranked municipal inspection queue. Smart City and Urban Innovation.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
      { url: "/assets/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/assets/favicon.ico"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B1220] text-[#F8FAFC] antialiased selection:bg-[#20D6C2]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
