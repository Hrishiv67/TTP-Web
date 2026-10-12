import { ActionBar } from "@/components/ActionBar";
import { BookBand } from "@/components/BookBand";
import { Location } from "@/components/Location";
import { Quote } from "@/components/Quote";
import { Reveal } from "@/components/Reveal";
import { Reviews } from "@/components/Reviews";
import { Services } from "@/components/Services";
import { Showroom } from "@/components/Showroom";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TireHelp } from "@/components/TireHelp";
import { TtpTire } from "@/components/TtpTire";
import { Visit } from "@/components/Visit";
import { Who } from "@/components/Who";
import { HOURS, REVIEWS, SECOND_LOCATION, SHOP } from "@/lib/business";
import { COPY, SERVICE_NAMES } from "@/lib/copy";
import { SITE_URL } from "@/lib/site";

const time24 = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Search engines read this to show hours, phone and address directly in results.
const structuredData = {
  "@context": "https://schema.org",
  "@type": ["TireShop", "AutoRepair"],
  "@id": `${SITE_URL}/#shop`,
  url: `${SITE_URL}/`,
  image: `${SITE_URL}/opengraph-image.png`,
  logo: `${SITE_URL}/logo.svg`,
  name: SHOP.legalName,
  alternateName: SHOP.name,
  foundingDate: String(SHOP.founded),
  telephone: SHOP.phone.e164,
  address: {
    "@type": "PostalAddress",
    streetAddress: SHOP.address.street,
    addressLocality: SHOP.address.city,
    addressRegion: SHOP.address.region,
    postalCode: SHOP.address.postalCode,
    addressCountry: "US",
  },
  openingHoursSpecification: Object.entries(HOURS).flatMap(([day, h]) =>
    h ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_NAMES[Number(day)], opens: time24(h.open), closes: time24(h.close) }] : [],
  ),
  aggregateRating: { "@type": "AggregateRating", ratingValue: REVIEWS.rating, reviewCount: REVIEWS.count },
  areaServed: ["Dunn, NC", "Harnett County, NC", "I-95 corridor, North Carolina"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Commercial tire and truck services",
    itemListElement: [
      ...SERVICE_NAMES.map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
      ...COPY.ttp.sizes.map((size) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Product", name: `${COPY.ttp.name} ${size}, 18 ply`, brand: { "@type": "Brand", name: COPY.ttp.name } },
      })),
    ],
  },
  department: {
    "@type": "TireShop",
    name: `${SHOP.name}, ${SECOND_LOCATION.label}`,
    telephone: SECOND_LOCATION.phone.e164,
    address: {
      "@type": "PostalAddress",
      streetAddress: SECOND_LOCATION.address.street,
      addressLocality: SECOND_LOCATION.address.city,
      addressRegion: SECOND_LOCATION.address.region,
      postalCode: SECOND_LOCATION.address.postalCode,
      addressCountry: "US",
    },
  },
};

export default function Home() {
  return (
    <>
      <a className="skip" href="#services">
        Skip to services
      </a>
      <SiteHeader />
      <main id="main">
        <Showroom />
        <TtpTire />
        <Services />
        <Reviews />
        <BookBand />
        <Location />
        <Visit />
        <TireHelp />
        <Who />
        <Quote />
      </main>
      <SiteFooter />
      <ActionBar />
      <Reveal />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
