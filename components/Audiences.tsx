import { AUDIENCES } from "@/lib/business";
import { SectionHead } from "./SectionHead";

export function Audiences() {
  return (
    <section className="section" id="who" aria-labelledby="who-title">
      <div className="wrap">
        <SectionHead id="who-title" index="05" label="Who we work for" title="For trucks that have somewhere to be." />
        <ul className="aud">
          {AUDIENCES.map((a) => (
            <li className="aud__cell" key={a.title}>
              <h3 className="display-m">{a.title}</h3>
              <p>{a.body}</p>
            </li>
          ))}
        </ul>
        <p className="aud__note">
          <span className="label">Commercial vehicles</span>
          <span>Driving something smaller? Call first and we’ll tell you honestly whether we can help.</span>
        </p>
      </div>
    </section>
  );
}
