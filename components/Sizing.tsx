import { Fragment } from "react";
import { SectionHead } from "./SectionHead";

const SEGMENTS = [
  { glyph: "295", label: "Section width", body: "Tire width in millimeters, sidewall to sidewall." },
  { glyph: "75", label: "Aspect ratio", body: "Sidewall height as a percent of that width." },
  { glyph: "R", label: "Construction", body: "Radial — nearly every truck tire made today.", accent: true },
  { glyph: "22.5", label: "Rim diameter", body: "Wheel size, in inches." },
];

export function Sizing() {
  return (
    <section className="section" id="sizing" aria-labelledby="sizing-title">
      <div className="wrap">
        <SectionHead
          id="sizing-title"
          index="03"
          label="Sizing"
          title="Read it off the sidewall."
          intro="Every truck tire has its size molded into the sidewall. Read us the code and we can tell you what we have before you pull in."
        />
        <div className="code" aria-label="295/75R22.5, explained">
          {SEGMENTS.map((s, i) => (
            <Fragment key={s.glyph}>
              {i === 1 ? (
                <p className="code__glyph code__slash" aria-hidden="true">
                  /
                </p>
              ) : null}
              <div className="code__seg" data-accent={s.accent || undefined}>
                <p className="code__glyph" aria-hidden="true">
                  {s.glyph}
                </p>
                <h3 className="label code__label">
                  <span className="sr-only">{s.glyph}: </span>
                  {s.label}
                </h3>
                <p className="code__body">{s.body}</p>
              </div>
            </Fragment>
          ))}
        </div>
        <div className="note">
          <p>
            Sizes like 11R22.5 skip the aspect ratio: 11-inch width, radial, 22.5-inch rim. Read us whatever’s on
            the sidewall — we’ll take it from there.
          </p>
          <a className="link" href="#quote">
            Send us your size <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
