import { COPY } from "@/lib/copy";

export function Visit() {
  const { heading, steps, turnaround } = COPY.visit;
  return (
    <section className="section" id="visit" aria-labelledby="visit-title">
      <div className="wrap">
        <div className="head">
          <h2 className="t-h2" id="visit-title">
            {heading}
          </h2>
        </div>
        <ol className="steps">
          {steps.map(([title, body]) => (
            <li key={title}>
              <h3 className="t-h3">{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        <div className="turnaround">
          <p className="t-h3">{turnaround.figure}</p>
          <p>{turnaround.note}</p>
        </div>
      </div>
    </section>
  );
}
