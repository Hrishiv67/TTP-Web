import Link from "next/link";
import { SECOND_LOCATION, SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { CopyrightYear } from "./CopyrightYear";

export function SiteFooter() {
  const f = COPY.footer;
  return (
    <footer className="footer" data-header="dark">
      <div className="wrap">
        <div className="footer__top">
          <div className="footer__brand">
            {/* eslint-disable-next-line @next/next/no-img-element -- static vector */}
            <img className="footer__logo" src="/logo-reverse.svg" alt={SHOP.legalName} width={1022} height={784} loading="lazy" />
            <div className="footer__ctas">
              <a className="btn" href="/book">
                {COPY.cta.book}
              </a>
              <a className="btn btn--line" href={telHref(SHOP.phone.e164)} aria-label={`${COPY.cta.quote}: call ${SHOP.phone.display}`}>
                {COPY.cta.quote}
              </a>
            </div>
          </div>
          <div className="footer__col">
            <h2>{f.visit}</h2>
            <address>
              {SHOP.address.street}
              <br />
              {SHOP.address.city}, {SHOP.address.region} {SHOP.address.postalCode}
            </address>
            <address>
              {SECOND_LOCATION.address.street}
              <br />
              {SECOND_LOCATION.address.city}, {SECOND_LOCATION.address.region} {SECOND_LOCATION.address.postalCode}
            </address>
          </div>
          <div className="footer__col">
            <h2>{f.call}</h2>
            <p>
              Dunn: <a href={telHref(SHOP.phone.e164)}>{SHOP.phone.display}</a>
            </p>
            <p>
              {SECOND_LOCATION.label}: <a href={telHref(SECOND_LOCATION.phone.e164)}>{SECOND_LOCATION.phone.display}</a>
            </p>
            <h2 className="footer__sub">{f.hours}</h2>
            <p>{COPY.hours.open}</p>
            <p>{COPY.hours.closed}, closed</p>
          </div>
          <nav className="footer__col" aria-label="Footer">
            <h2>{f.links}</h2>
            <ul>
              {COPY.nav.map((n) => (
                <li key={n.href}>
                  <a href={n.href}>{n.label}</a>
                </li>
              ))}
              <li>
                <Link href="/#tire-help">{COPY.tireHelp.heading}</Link>
              </li>
              <li>
                <a href="/book">{COPY.cta.book}</a>
              </li>
              <li>
                <Link href="/#quote">Get a quote by text</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="footer__bottom">
          <p>{f.blurb}</p>
          <p>
            © <CopyrightYear /> {SHOP.legalName}
          </p>
          <a href="#top">{f.backToTop}</a>
        </div>
      </div>
    </footer>
  );
}
