import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { I18nProvider } from "./i18n";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "hanvschu.example";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: {
      default: "Han vs Chu — Dynasty Chess Online",
      template: "%s · Han vs Chu",
    },
    description:
      "Ancient China strategy battle, played today. Learn and play Xiangqi online in minutes as a guest.",
    icons: { icon: "/favicon.png", shortcut: "/favicon.png" },
    openGraph: {
      title: "Han vs Chu — Dynasty Chess Online",
      description: "Ancient China Strategy Battle. Play Xiangqi instantly.",
      type: "website",
      url: origin,
      images: [
        {
          url: `${origin}/og.png`,
          width: 1200,
          height: 630,
          alt: "楚汉 · Han vs Chu — Dynasty Chess Online",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Han vs Chu — Dynasty Chess Online",
      description: "Ancient China Strategy Battle. Play Xiangqi instantly.",
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
