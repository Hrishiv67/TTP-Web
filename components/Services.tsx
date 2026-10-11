import { COPY } from "@/lib/copy";

export function Services() {
  const { heading, intro, groups } = COPY.services;
  return (
    <section className="section" id="services" aria-labelledby="services-title">
      <div className="wrap">
        <div className="head">
          <h2 className="t-h2" id="services-title">
            {heading}
          </h2>
          <p className="t-lede">{intro}</p>
        </div>
        {groups.map((g) => (
          <div className="svc" key={g.name}>
            <h3 className="t-h3">{g.name}</h3>
            <ul className="rows">
              {g.items.map(([name, body]) => (
                <li className="row" key={name}>
                  <h4>{name}</h4>
                  <p>{body}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
