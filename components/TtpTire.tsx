import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { CalendarIcon } from "./icons";
import { WatchLink } from "./WatchLink";

/** The tires we sell: the shop's own TTP Tire, then what's in stock. */
export function TtpTire() {
  const t = COPY.ttp, s = COPY.stock;
  return (
    <section className="section tires" id="ttp-tire" aria-labelledby="ttp-title">
      <div className="wrap">
        <div className="tires__grid">
          <div className="tires__media" data-reveal>
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized render, already compressed */}
            <img src="/services/ttp.webp" alt={t.alt} width={1200} height={1200} loading="lazy" decoding="async" />
          </div>
          <div className="tires__body" data-reveal>
            <p className="tires__kicker">{t.kicker}</p>
            <h2 className="t-h2" id="ttp-title">
              {t.name}
            </h2>
            <p className="t-lede">{t.body}</p>
            <dl className="tires__facts">
              {t.facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="tires__price">
              {t.pricePrefix} <a href={telHref(SHOP.phone.e164)}>{SHOP.phone.display}</a> {t.priceSuffix}
            </p>
            <div className="tires__actions">
              <a className="btn" href={`/book?service=${encodeURIComponent(t.name)}`}>
                <CalendarIcon />
                <span>{COPY.cta.book}</span>
              </a>
              <WatchLink service="ttp" label={`${t.watch}: ${t.name}`}>
                {t.watch}
              </WatchLink>
            </div>
          </div>
        </div>

        <div className="stock" data-reveal>
          <div>
            <h3 className="t-h3">{s.heading}</h3>
            <p>{s.body}</p>
          </div>
          <div>
            <h3 className="stock__label">{s.popularHeading}</h3>
            <ul className="stock__sizes">
              {s.popular.map((size) => (
                <li key={size}>{size}</li>
              ))}
            </ul>
          </div>
          <p className="stock__promise">{s.promise}</p>
        </div>
      </div>
    </section>
  );
}
