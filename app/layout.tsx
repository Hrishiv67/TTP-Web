import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Barlow was drawn from highway signs and plates — the right voice for a truck shop.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
  display: "swap",
});

const condensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-condensed",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const description =
  "New and used commercial truck tires, mounting, flat repair, balancing, alignment and trailer service in Dunn, North Carolina — a few minutes off I-95. Call (910) 230-0433.";

export const metadata: Metadata = {
  title: "Truck Tire Pro — Commercial Truck Tires in Dunn, NC",
  description,
  applicationName: "Truck Tire Pro",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Truck Tire Pro",
    title: "Truck Tire Pro — Commercial Truck Tires in Dunn, NC",
    description,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: true, address: true },
};

export const viewport: Viewport = {
  themeColor: "#16130f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${condensed.variable} ${plexMono.variable}`}>
      <body id="top">{children}</body>
    </html>
  );
}
