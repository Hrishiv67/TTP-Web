import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SHOP, oneLine } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";

const C = COPY.terms;

export const metadata: Metadata = {
  title: C.title,
  description: C.description,
  alternates: { canonical: "/terms" },
  openGraph: { title: C.title, description: C.description, url: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <a className="skip" href="#terms">
        {C.skip}
      </a>
      <SiteHeader />
      <main id="main" className="termspage">
        <article className="wrap termspage__body" id="terms" aria-labelledby="terms-title">
          <header className="termspage__head">
            <h1 className="t-h2" id="terms-title">{C.heading}</h1>
            <p>{C.updated}</p>
            <p className="t-lede">{C.intro}</p>
          </header>
          {C.sections.map((section) => (
            <section className="termspage__section" key={section.heading}>
              <h2 className="t-h3">{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          <section className="termspage__section">
            <h2 className="t-h3">{C.contactHeading}</h2>
            <p>{C.contactBody}</p>
            <address>
              {SHOP.legalName}
              <br />
              {oneLine(SHOP.address)}
              <br />
              <a className="link" href={telHref(SHOP.phone.e164)}>{SHOP.phone.display}</a>
            </address>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
