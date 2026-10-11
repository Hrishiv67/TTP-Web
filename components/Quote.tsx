import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { QuoteForm } from "./QuoteForm";

export function Quote() {
  const { heading, intro, callLine } = COPY.quote;
  return (
    <section className="section" id="quote" aria-labelledby="quote-title">
      <div className="wrap quote">
        <div className="quote__head">
          <h2 className="t-h2" id="quote-title">
            {heading}
          </h2>
          <p className="t-lede">{intro}</p>
          <p>
            {callLine}{" "}
            <a className="link" href={telHref(SHOP.phone.e164)}>
              {SHOP.phone.display}
            </a>
            .
          </p>
        </div>
        <div className="quote__form">
          <QuoteForm />
        </div>
      </div>
    </section>
  );
}
