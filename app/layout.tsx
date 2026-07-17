import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { I18nProvider } from "./i18n";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "xiangqi-arena.example";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: {
      default: "Xiangqi Arena — Play & Learn Chinese Chess",
      template: "%s · Xiangqi Arena",
    },
    description:
      "The easiest modern place for Western players to learn and play Xiangqi online. Start instantly as a guest.",
    icons: { icon: "/favicon.png", shortcut: "/favicon.png" },
    openGraph: {
      title: "The fastest way into Xiangqi.",
      description: "Play instantly. Learn as you go.",
      type: "website",
      url: origin,
      images: [
        {
          url: `${origin}/og.png`,
          width: 1200,
          height: 630,
          alt: "Xiangqi Arena — The fastest way into Xiangqi",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "The fastest way into Xiangqi.",
      description: "Play instantly. Learn as you go.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
