import { REVIEWS, SHOP } from "@/lib/business";
import { telHref } from "@/lib/quote";
import { PhoneIcon } from "./icons";
import { TireDrawing } from "./TireDrawing";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero__inner">
        <div className="hero__copy">
          <p className="label hero__eyebrow">Commercial truck tires · Dunn, North Carolina</p>
          <h1 className="display-xl" id="hero-title">
            Your truck <br />
            only earns <br />
            when it rolls.
          </h1>
          <p className="body-l hero__lede">
            New and used tires for semis, trailers and dump trucks — sold, mounted, balanced and repaired a
            few minutes off <span className="nowrap">I-95</span>. Call with your size and we’ll tell you what’s on the rack.
          </p>
          <div className="hero__actions">
            <a className="btn btn--red btn--lg" href={telHref(SHOP.phone.e164)}>
              <PhoneIcon />
              <span>Call {SHOP.phone.display}</span>
            </a>
            <a className="link" href="#quote">
              Text us your tire size <span aria-hidden="true">→</span>
            </a>
          </div>
          <dl className="facts">
            <div>
              <dt>Hours</dt>
              <dd>Mon–Fri · 8 AM – 5 PM</dd>
            </div>
            <div>
              <dt>Shop</dt>
              <dd>{SHOP.address.street}, Dunn</dd>
            </div>
            <div>
              <dt>Reviews</dt>
              <dd>
                <a href="#reviews">
                  {REVIEWS.rating} <span aria-hidden="true">★</span>
                  <span className="sr-only"> out of 5</span> · {REVIEWS.count} reviews
                </a>
              </dd>
            </div>
          </dl>
        </div>
        <figure className="hero__figure">
          <TireDrawing />
          <figcaption className="label-s">Fig. 1 — 295/75R22.5 · a common steer and drive size</figcaption>
        </figure>
      </div>
    </section>
  );
}
