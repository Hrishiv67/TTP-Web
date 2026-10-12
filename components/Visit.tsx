import { COPY } from "@/lib/copy";
import { KeepTogether } from "./KeepTogether";

export function Visit() {
  const { heading, steps, turnaround } = COPY.visit;
  return (
    <section className="section section--compact" id="visit" aria-labelledby="visit-title">
      <div className="wrap">
        <div className="head">
          <h2 className="t-h2" id="visit-title">
            {heading}
          </h2>
        </div>
        <ol className="steps" data-reveal>
          {steps.map(([title, body]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>
                <KeepTogether text={body} />
              </p>
            </li>
          ))}
        </ol>
        <div className="turnaround" data-reveal>
          <p className="t-h3">{turnaround.figure}</p>
          <p>{turnaround.note}</p>
        </div>
      </div>
    </section>
  );
}
