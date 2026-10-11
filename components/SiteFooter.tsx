import { HOURS, NAV, SECOND_LOCATION, SHOP } from "@/lib/business";
import { formatRange } from "@/lib/hours";
import { telHref } from "@/lib/quote";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          {/* eslint-disable-next-line @next/next/no-img-element -- static vector */}
          <img className="footer__logo" src="/logo-reverse.svg" alt={`${SHOP.legalName} — Quality Tires`} width={1022} height={784} loading="lazy" />
          <div className="footer__col">
            <h2 className="label-s">Visit</h2>
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
            <h2 className="label-s">Call</h2>
            <p>
              <span>Dunn</span>
              <a href={telHref(SHOP.phone.e164)}>{SHOP.phone.display}</a>
            </p>
            <p>
              <span>Fayetteville</span>
              <a href={telHref(SECOND_LOCATION.phone.e164)}>{SECOND_LOCATION.phone.display}</a>
            </p>
          </div>
          <div className="footer__col">
            <h2 className="label-s">Hours</h2>
            <p>
              <span>Mon–Fri</span>
              {formatRange(HOURS[1])}
            </p>
            <p>
              <span>Sat–Sun</span>
              Closed
            </p>
          </div>
          <nav className="footer__col" aria-label="Footer">
            <h2 className="label-s">On this page</h2>
            <ul>
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href}>{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="footer__bottom label-s">
          <p>
            © {new Date().getFullYear()} {SHOP.legalName} · Dunn, North Carolina · Est. {SHOP.founded}
          </p>
          <a href="#top">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
