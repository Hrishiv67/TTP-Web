import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { PhoneIcon } from "./icons";
import { KeepTogether } from "./KeepTogether";
import { TireStage, type StageBeat } from "./stage/TireStage";

/** The opening of the page: the three tire positions, one at a time. */
export function TireSequence() {
  const { hero, tires } = COPY;

  const actions = (
    <div className="beat__actions">
      <a className="btn" href={telHref(SHOP.phone.e164)}>
        <PhoneIcon />
        <span>{hero.call}</span>
      </a>
      <a className="link" href="#quote">
        {hero.text}
      </a>
    </div>
  );

  const beats: StageBeat[] = [
    {
      id: "intro",
      layout: "top",
      interactive: true,
      children: (
        <div className="beat__intro">
          <h1 className="t-hero">
            <KeepTogether text={hero.headline} />
          </h1>
          <div className="beat__row">
            <p className="t-lede">{hero.sub}</p>
            {actions}
          </div>
        </div>
      ),
    },
    {
      id: "bridge",
      layout: "top",
      children: <p className="beat__bridge">{tires.intro}</p>,
    },
    ...tires.positions.flatMap((t): StageBeat[] => [
      {
        id: `${t.kind}-name`,
        layout: "side",
        still: `/stage/${t.kind}-name.webp`,
        children: (
          <div className="beat__panel">
            <h2 className="t-display">{t.name}</h2>
            <p className="t-lede">{t.line}</p>
          </div>
        ),
      },
      {
        id: `${t.kind}-tread`,
        layout: "side",
        still: `/stage/${t.kind}-tread.webp`,
        children: (
          <div className="beat__panel">
            <p className="t-lede">{t.body}</p>
            <dl className="facts">
              {t.facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ),
      },
    ]),
    {
      id: "outro",
      layout: "top",
      interactive: true,
      children: (
        <div className="beat__intro">
          <p className="beat__bridge">{tires.outro}</p>
          {actions}
        </div>
      ),
    },
  ];

  return (
    <TireStage
      id="tires"
      label={tires.label}
      beats={beats}
      poster={
        <picture>
          <source media="(max-aspect-ratio: 9/10)" srcSet="/stage/poster-tall.webp" width={780} height={1688} />
          <img
            src="/stage/poster-wide.webp"
            alt="A steer tire, a drive tire and a trailer tire standing side by side"
            width={2400}
            height={1500}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      }
    />
  );
}
