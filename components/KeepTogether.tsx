import { Fragment } from "react";

// Hard hyphens are break points, so "I-95" could split across two lines.
const UNBREAKABLE = /(I-95)/;

/** Renders text with "I-95" held on one line. */
export function KeepTogether({ text }: { text: string }) {
  return (
    <>
      {text.split(UNBREAKABLE).map((part, i) =>
        UNBREAKABLE.test(part) ? (
          <span key={i} className="nowrap">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
