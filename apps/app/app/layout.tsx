import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { SLOGAN } from "@slicedlabs/brand";
import { AppNav } from "./_components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlicedLabs — Member Cockpit",
  description: SLOGAN,
  robots: { index: false, follow: false }, // private app: keep out of search.
};
export const viewport: Viewport = { themeColor: "#161619" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // data-temp is the SAME cookie used across subdomains for warm/dark continuity →
  // read it server-side so first paint matches (no flash); the toggle updates both.
  const cookieStore = await cookies();
  const temp = cookieStore.get("sl-temp")?.value === "warm" ? "warm" : "dark";

  return (
    <html lang="en" data-temp={temp}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300..800&family=Inter:wght@400..700&family=JetBrains+Mono:wght@400..600&display=swap"
        />
      </head>
      <body>
        <AppNav />
        <main className="mx-auto w-full max-w-[var(--maxw)] px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
