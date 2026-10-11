import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { CalendarIcon, PhoneIcon } from "./icons";

/** The shop's own brand of tire. */
export function TtpTire() {
  const t = COPY.ttp;
  return (
    <section className="section ttp" id="ttp-tire" aria-labelledby="ttp-title">
      <div className="wrap ttp__grid">
        <div className="ttp__media" data-reveal>
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized render, already compressed */}
          <img src="/services/ttp.webp" alt={t.alt} width={1200} height={1200} loading="lazy" decoding="async" />
        </div>
        <div className="ttp__body" data-reveal>
          <p className="ttp__kicker">{t.kicker}</p>
          <h2 className="t-h2" id="ttp-title">
            {t.name}
          </h2>
          <p className="t-lede">{t.body}</p>
          <dl className="ttp__facts">
            {t.facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="ttp__price">{t.price}</p>
          <div className="ttp__actions">
            <a className="btn" href={telHref(SHOP.phone.e164)} aria-label={`${COPY.cta.quote}: call ${SHOP.phone.display}`}>
              <PhoneIcon />
              <span>{COPY.cta.quote}</span>
            </a>
            <a className="btn btn--line" href={`/book?service=${encodeURIComponent(t.name)}`}>
              <CalendarIcon />
              <span>{COPY.cta.book}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
