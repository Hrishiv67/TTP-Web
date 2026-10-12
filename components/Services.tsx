import { COPY } from "@/lib/copy";
import { WatchLink } from "./WatchLink";

const bookHref = (service: string) => `/book?service=${encodeURIComponent(service)}`;

export function Services() {
  const { heading, intro, main, alsoHeading, also, other } = COPY.services;
  return (
    <section className="section" id="services" aria-labelledby="services-title">
      <div className="wrap">
        <div className="head">
          <h2 className="t-h2" id="services-title">
            {heading}
          </h2>
          <p className="t-lede">{intro}</p>
        </div>
        <ul className="cards">
          {main.map((s) => (
            <li className="card" key={s.id} id={`svc-${s.id}`} data-reveal>
              <div className="card__media">
                {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized renders, already compressed */}
                <img src={`/services/${s.id}.webp`} alt={s.alt} width={1000} height={1000} loading="lazy" decoding="async" />
              </div>
              <h3 className="card__name">{s.name}</h3>
              <p>{s.body}</p>
              {/* plays this service in the hero; where the hero is a still, books it instead */}
              <WatchLink service={s.id} label={`${COPY.cta.seeMore}: ${s.name}`}>
                {COPY.cta.seeMore}
              </WatchLink>
              <a className="link card__book" href={bookHref(s.name)} aria-label={`${COPY.cta.bookTime} for ${s.name.toLowerCase()}`}>
                {COPY.cta.bookTime}
              </a>
            </li>
          ))}
        </ul>
        <div className="also" data-reveal>
          <h3 className="t-h3">{alsoHeading}</h3>
          <ul className="rows">
            {also.map(([name, body]) => (
              <li className="row" key={name}>
                <h4>{name}</h4>
                <p>{body}</p>
              </li>
            ))}
          </ul>
          <p className="note">{other}</p>
        </div>
      </div>
    </section>
  );
}
