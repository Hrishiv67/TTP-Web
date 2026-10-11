import { COPY } from "@/lib/copy";

export function Sizing() {
  const { heading, intro, code, parts, note } = COPY.sizing;
  return (
    <section className="section" id="sizing" aria-labelledby="sizing-title">
      <div className="wrap">
        <div className="head">
          <h2 className="t-h2" id="sizing-title">
            {heading}
          </h2>
          <p className="t-lede">{intro}</p>
        </div>
        {/* the code, split at its parts and underlined part by part; read out whole */}
        <p className="size-code" role="img" aria-label={code}>
          <span>295</span>
          <span className="size-code__sep">/</span>
          <span>75</span>
          <span>R</span>
          <span>22.5</span>
        </p>
        <ol className="size-parts">
          {parts.map(([part, label, body]) => (
            <li key={part}>
              <b>{part}</b>
              <h3>{label}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        <p className="note">{note}</p>
      </div>
    </section>
  );
}
