import { ActionBar } from "@/components/ActionBar";
import { Audiences } from "@/components/Audiences";
import { Hero } from "@/components/Hero";
import { Locations } from "@/components/Locations";
import { Positions } from "@/components/Positions";
import { Process } from "@/components/Process";
import { Quote } from "@/components/Quote";
import { Reviews } from "@/components/Reviews";
import { Services } from "@/components/Services";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Sizing } from "@/components/Sizing";
import { ALL_SERVICES, SECOND_LOCATION, SHOP } from "@/lib/business";

// Search engines read this to show hours, phone and address directly in results.
const structuredData = {
  "@context": "https://schema.org",
  "@type": ["TireShop", "AutoRepair"],
  name: SHOP.legalName,
  alternateName: SHOP.name,
  slogan: "Quality Tires",
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
      opens: "08:00",
      closes: "17:00",
    },
  ],
  areaServed: ["Dunn, NC", "Harnett County, NC", "I-95 corridor, North Carolina"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Commercial tire and truck services",
    itemListElement: ALL_SERVICES.map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
  },
  department: {
    "@type": "TireShop",
    name: `${SHOP.name} — ${SECOND_LOCATION.label}`,
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
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Services />
        <Positions />
        <Sizing />
        <Process />
        <Audiences />
        <Reviews />
        <Locations />
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
