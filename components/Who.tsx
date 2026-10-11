import { COPY } from "@/lib/copy";
import { KeepTogether } from "./KeepTogether";

export function Who() {
  const { heading, items, note } = COPY.who;
  return (
    <section className="section section--compact" id="who" aria-labelledby="who-title">
      <div className="wrap">
        <div className="head">
          <h2 className="t-h2" id="who-title">
            {heading}
          </h2>
        </div>
        <ul className="who" data-reveal>
          {items.map(([title, body]) => (
            <li key={title}>
              <h3>
                <KeepTogether text={title} />
              </h3>
              <p>
                <KeepTogether text={body} />
              </p>
            </li>
          ))}
        </ul>
        <p className="note">{note}</p>
      </div>
    </section>
  );
}
