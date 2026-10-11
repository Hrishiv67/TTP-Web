import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { PhoneIcon } from "./icons";

/** What's in stock: semi truck tires, and the sizes people ask for most. */
export function Sizes() {
  const s = COPY.sizes;
  return (
    <section className="section stock" id="sizes" aria-labelledby="sizes-title">
      <div className="wrap">
        <div className="head">
          <h2 className="t-h2" id="sizes-title">
            {s.heading}
          </h2>
          <p className="t-lede">{s.body}</p>
        </div>
        <div className="stock__row" data-reveal>
          <h3 className="stock__label">{s.popularHeading}</h3>
          <ul className="stock__sizes">
            {s.popular.map((size) => (
              <li key={size}>{size}</li>
            ))}
          </ul>
        </div>
        <div className="stock__foot" data-reveal>
          <p className="t-h3">{s.promise}</p>
          <div className="stock__call">
            <p>{s.price}</p>
            <a className="btn" href={telHref(SHOP.phone.e164)} aria-label={`${COPY.cta.quote}: call ${SHOP.phone.display}`}>
              <PhoneIcon />
              <span>{COPY.cta.quote}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
