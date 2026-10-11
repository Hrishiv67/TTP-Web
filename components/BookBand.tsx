import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { CalendarIcon, PhoneIcon } from "./icons";

/** A black band between sections that asks for the booking. */
export function BookBand() {
  const { heading, body } = COPY.bookBand;
  return (
    <section className="band" data-header="dark" aria-labelledby="band-title">
      <div className="wrap band__inner" data-reveal>
        <div>
          <h2 className="t-h2" id="band-title">
            {heading}
          </h2>
          <p className="t-lede">{body}</p>
        </div>
        <div className="band__actions">
          <a className="btn" href="/book">
            <CalendarIcon />
            <span>{COPY.cta.book}</span>
          </a>
          <a className="btn btn--line" href={telHref(SHOP.phone.e164)} aria-label={`${COPY.cta.quote}: call ${SHOP.phone.display}`}>
            <PhoneIcon />
            <span>{COPY.cta.quote}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
