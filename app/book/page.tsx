import type { Metadata } from "next";
import { BookingForm } from "@/components/BookingForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SHOP, directionsUrl } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";

const C = COPY.booking;

export const metadata: Metadata = {
  title: C.title,
  description: C.description,
  alternates: { canonical: "/book" },
  openGraph: { title: C.title, description: C.description, url: "/book" },
};

export default function BookPage() {
  return (
    <>
      <a className="skip" href="#booking">
        Skip to the booking form
      </a>
      <SiteHeader />
      <main id="main" className="bkpage">
        <div className="wrap bkpage__grid">
          <div className="bkpage__head">
            <h1 className="t-h2">{C.heading}</h1>
            <p className="t-lede">{C.intro}</p>
            <dl className="bkpage__facts">
              <div>
                <dt>{C.side.hoursHeading}</dt>
                <dd>
                  {COPY.hours.open}
                  <br />
                  {COPY.hours.closed}, closed
                </dd>
              </div>
              <div>
                <dt>{C.side.whereHeading}</dt>
                <dd>
                  {SHOP.address.street}, {SHOP.address.city}, {SHOP.address.region}
                  <br />
                  <a className="link" href={directionsUrl(SHOP.address)} target="_blank" rel="noopener noreferrer">
                    {COPY.location.directions}
                  </a>
                </dd>
              </div>
              <div>
                <dt>{C.side.callHeading}</dt>
                <dd>
                  <a className="link" href={telHref(SHOP.phone.e164)}>
                    {SHOP.phone.display}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
          <div className="bkpage__form" id="booking">
            <BookingForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
