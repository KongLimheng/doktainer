import type { Metadata } from "next";
import "./globals.css";
import "@xterm/xterm/css/xterm.css";
import ThemeController from "@/components/ThemeController";
import { getInitialThemeScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Doktainer — Server & Infrastructure Management",
  description:
    "Manage your VPS servers, Docker containers, domains, SSL, and security all from one powerful dashboard.",
  keywords: ["VPS", "Docker", "Server Management", "SSL", "Domain", "DevOps"],
  authors: [{ name: "KodekaTeamOfficial" }],
  openGraph: {
    title: "Doktainer — Server & Infrastructure Management",
    description:
      "Manage your VPS servers, Docker containers, domains, SSL, and security all from one powerful dashboard.",
    type: "website",
  },
  icons: {
    icon: "/assets/images/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getInitialThemeScript() }} />
      </head>
      <body className="antialiased">
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
