import { SHOP } from "@/lib/business";
import { telHref } from "@/lib/quote";
import { QuoteForm } from "./QuoteForm";

export function Quote() {
  return (
    <section className="section section--ink quote" id="quote" aria-labelledby="quote-title">
      <div className="wrap quote__inner">
        <div className="quote__pitch">
          <p className="eyebrow">
            <span className="eyebrow__index">07</span>
            <span className="eyebrow__rule" aria-hidden="true" />
            <span>Get a quote</span>
          </p>
          <h2 className="display-l" id="quote-title">
            Send your size. Get a straight answer.
          </h2>
          <p className="body-l quote__lede">
            Fill this in and your phone opens a text to the shop with everything we need to quote you. Nothing is
            sent until you hit send.
          </p>
          <div className="quote__call">
            <p className="label">Rather talk?</p>
            <a className="display-m" href={telHref(SHOP.phone.e164)}>
              {SHOP.phone.display}
            </a>
          </div>
        </div>
        <QuoteForm />
      </div>
    </section>
  );
}
