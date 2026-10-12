import { Fragment } from "react";

// Hard hyphens and spaces are break points, so "I-95", "22.5-inch" or a phone number
// could split across two lines.
const UNBREAKABLE = /(I-95|\d+(?:\.\d+)?-inch(?:-\w+)?|\(\d{3}\) \d{3}-\d{4})/;

/** Renders text with "I-95", sizes like "22.5-inch" and phone numbers held on one line. */
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
