import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bootube.app"),
  title: "BooTube | Ghost the Inappropriate Words",
  description: "Tired of scrambling for the remote? BooTube automatically mutes profanity and blasphemy in real-time across YouTube, Netflix, Disney+, Hulu, Prime Video, Max, Peacock, Paramount+, Plex, Fandango, Spotify, Facebook, and X.",
  alternates: {
    canonical: "https://bootube.app",
  },
  openGraph: {
    title: "BooTube | Ghost the Inappropriate Words",
    description: "Real-time profanity and blasphemy muting across 13 major streaming services. Clean, family-friendly audio with zero interrupted playback.",
    url: "https://bootube.app",
    siteName: "BooTube",
    images: [
      {
        url: "/gemini-hero.jpeg",
        width: 1200,
        height: 630,
        alt: "BooTube — Keep Your Streams Clean",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BooTube | Ghost the Inappropriate Words",
    description: "Real-time profanity and blasphemy muting across 13 major streaming services.",
    images: ["/gemini-hero.jpeg"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/boo-icon-glyph.svg", type: "image/svg+xml" }
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#050505] text-[#f3f4f6]">{children}</body>
    </html>
  );
}
