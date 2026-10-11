import { SERVICE_GROUPS } from "@/lib/business";
import { SectionHead } from "./SectionHead";

export function Services() {
  return (
    <section className="section" id="services" aria-labelledby="services-title">
      <div className="wrap">
        <SectionHead
          id="services-title"
          index="01"
          label="Services"
          title="Tires, mostly. And the jobs that come with them."
          intro="Commercial tires are the core of the shop — selling them, mounting them and fixing them. We also take care of the repairs drivers need while they’re here."
        />
        <div className="svc">
          {SERVICE_GROUPS.map((group) => {
            const first = group.services[0].n;
            const last = group.services[group.services.length - 1].n;
            return (
              <div className="svc__group" key={group.letter}>
                <h3 className="svc__head label">
                  <span className="svc__letter">{group.letter}</span>
                  <span>{group.name}</span>
                  <span className="svc__range" aria-label={`services ${first} to ${last}`}>
                    {first}–{last}
                  </span>
                </h3>
                <ul className="svc__list">
                  {group.services.map((s) => (
                    <li className="svc__row" key={s.n}>
                      <span className="svc__num label" aria-hidden="true">
                        {s.n}
                      </span>
                      <h4 className="svc__name heading-s">{s.name}</h4>
                      <p className="svc__desc">{s.description}</p>
                      <p className="svc__tag label-s">{s.tag}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
