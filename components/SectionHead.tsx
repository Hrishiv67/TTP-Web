import type { ReactNode } from "react";

/** "01 —— Services" plus the section title, with an optional intro set against it. */
export function SectionHead({
  index,
  label,
  title,
  intro,
  id,
}: {
  index: string;
  label: string;
  title: ReactNode;
  intro?: ReactNode;
  id: string;
}) {
  return (
    <header className="head">
      <div className="head__title">
        <p className="eyebrow">
          <span className="eyebrow__index">{index}</span>
          <span className="eyebrow__rule" aria-hidden="true" />
          <span>{label}</span>
        </p>
        <h2 className="display-l" id={id}>
          {title}
        </h2>
      </div>
      {intro ? <p className="head__intro body-l">{intro}</p> : null}
    </header>
  );
}
