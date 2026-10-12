import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { smsHref } from "@/lib/quote";
import { MessageIcon } from "./icons";
import { KeepTogether } from "./KeepTogether";

/** Help working out the right tire: reading the size, and which tire goes where. */
export function TireHelp() {
  const { heading, intro, textPhoto, sizing, positions } = COPY.tireHelp;
  return (
    <section className="section section--compact" id="tire-help" aria-labelledby="tire-help-title">
      <div className="wrap">
        <div className="head">
          <h2 className="t-h2" id="tire-help-title">
            {heading}
          </h2>
          <div className="head__side">
            <p className="t-lede">{intro}</p>
            <a className="btn btn--sm btn--ink" href={smsHref(SHOP.phone.e164, COPY.sms.sidewall)}>
              <MessageIcon size={16} />
              <span>{textPhoto}</span>
            </a>
          </div>
        </div>
        <div className="help">
          <div className="help__col" data-reveal>
            <h3 className="t-h3">{sizing.heading}</h3>
            {/* the code, split at its parts and underlined part by part; read out whole */}
            <p className="size-code" role="img" aria-label={sizing.code}>
              <span>295</span>
              <span className="size-code__sep">/</span>
              <span>75</span>
              <span>R</span>
              <span>22.5</span>
            </p>
            <ol className="size-parts">
              {sizing.parts.map(([part, label, body]) => (
                <li key={part}>
                  <b>{part}</b>
                  <h4>{label}</h4>
                  <p>
                    <KeepTogether text={body} />
                  </p>
                </li>
              ))}
            </ol>
            <p className="note">
              <KeepTogether text={sizing.note} />
            </p>
          </div>
          <div className="help__col" data-reveal>
            <h3 className="t-h3">{positions.heading}</h3>
            <ul className="rows">
              {positions.rows.map(([name, body]) => (
                <li className="row" key={name}>
                  <h4>{name}</h4>
                  <p>{body}</p>
                </li>
              ))}
            </ul>
            <p className="note">{positions.sizes}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
