import { ActionBar } from "@/components/ActionBar";
import { Location } from "@/components/Location";
import { Quote } from "@/components/Quote";
import { Reviews } from "@/components/Reviews";
import { Services } from "@/components/Services";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Sizing } from "@/components/Sizing";
import { TireSequence } from "@/components/TireSequence";
import { Visit } from "@/components/Visit";
import { Who } from "@/components/Who";
import { HOURS, REVIEWS, SECOND_LOCATION, SHOP } from "@/lib/business";
import { ALL_SERVICES } from "@/lib/copy";
import { SITE_URL } from "@/lib/site";

const time24 = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const weekday = HOURS[1]!;

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
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: time24(weekday.open),
      closes: time24(weekday.close),
    },
  ],
  aggregateRating: { "@type": "AggregateRating", ratingValue: REVIEWS.rating, reviewCount: REVIEWS.count },
  areaServed: ["Dunn, NC", "Harnett County, NC", "I-95 corridor, North Carolina"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Commercial tire and truck services",
    itemListElement: ALL_SERVICES.map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
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
        <TireSequence />
        <Services />
        <Sizing />
        <Visit />
        <Who />
        <Reviews />
        <Location />
        <Quote />
      </main>
      <SiteFooter />
      <ActionBar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
