import type { Metadata } from "next";
import Link from "next/link";
import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";

export const metadata: Metadata = { title: `${COPY.notFound.heading} | ${SHOP.name}` };

export default function NotFound() {
  const c = COPY.notFound;
  return (
    <main className="notfound">
      <div className="wrap">
        <h1 className="t-hero">{c.heading}</h1>
        <p className="t-lede" style={{ marginTop: 24 }}>
          {c.body}
        </p>
        <p className="notfound__actions" style={{ marginTop: 40 }}>
          <Link className="btn" href="/">
            {c.home}
          </Link>
          <a className="link" href={telHref(SHOP.phone.e164)}>
            Call {SHOP.phone.display}
          </a>
        </p>
      </div>
    </main>
  );
}
