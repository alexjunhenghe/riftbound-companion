import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Riftbound Companion",
  description:
    "Track your Riftbound collection, build decks with prices, and log matches. Unofficial and unaffiliated fan project.",
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/cards", label: "Cards" },
  { href: "/collection", label: "Collection" },
  { href: "/decks", label: "Decks" },
  { href: "/matches", label: "Matches" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-neutral-900 dark:bg-black dark:text-white">
        <StoreProvider>
          <div className="flex min-h-screen flex-col md:flex-row">
            <aside className="w-full shrink-0 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black md:sticky md:top-0 md:h-screen md:w-56 md:border-b-0 md:border-r">
              <div className="px-4 py-4">
                <Link href="/" className="text-lg font-bold tracking-tight">
                  Riftbound Companion
                </Link>
                <p className="mt-1 text-xs text-neutral-500">
                  Unofficial fan project. Not affiliated with Riot.
                </p>
              </div>
              <nav aria-label="Pages" className="px-2 pb-4">
                <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Pages
                </p>
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-2 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
              {children}
            </main>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
