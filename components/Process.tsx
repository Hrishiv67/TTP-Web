import { STEPS } from "@/lib/business";
import { SectionHead } from "./SectionHead";

export function Process() {
  return (
    <section className="section section--paper2" id="how-it-works" aria-labelledby="process-title">
      <div className="wrap">
        <SectionHead id="process-title" index="04" label="How a stop works" title="In, fixed, back on the road." />
        <ol className="steps">
          {STEPS.map((s) => (
            <li className="steps__item" key={s.n}>
              <span className="label steps__num">{s.n}</span>
              <h3 className="heading-s">{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="stat">
          <p className="display-l stat__figure">
            8 tires <span>in ~45 min</span>
          </p>
          <p className="stat__note">
            One customer’s reported turnaround for eight tires. Every job is different — call and we’ll give you a
            realistic time for yours.
          </p>
        </div>
      </div>
    </section>
  );
}
