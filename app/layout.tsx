import type { Metadata, Viewport } from "next";
import { Besley, Libre_Franklin } from "next/font/google";
import { COPY } from "@/lib/copy";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Besley is a Clarendon: the bracketed slab of wood-type posters and old shop signs.
const besley = Besley({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-besley",
  display: "swap",
});

// Libre Franklin revives Franklin Gothic, the face of American signage and newsprint.
const franklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-franklin",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: COPY.meta.title,
  description: COPY.meta.description,
  applicationName: "Truck Tire Pro",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Truck Tire Pro",
    title: COPY.meta.title,
    description: COPY.meta.description,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: true, address: true },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${besley.variable} ${franklin.variable}`}>
      <body id="top">{children}</body>
    </html>
  );
}
