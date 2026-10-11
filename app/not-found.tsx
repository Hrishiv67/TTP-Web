import type { Metadata } from "next";
import Link from "next/link";
import { SHOP } from "@/lib/business";
import { telHref } from "@/lib/quote";

export const metadata: Metadata = { title: "Page not found — Truck Tire Pro" };

export default function NotFound() {
  return (
    <main className="wrap lost">
      <p className="label">404 · Wrong exit</p>
      <h1 className="display-l">This page isn’t on the map.</h1>
      <p className="body-l">
        The page you were after doesn’t exist. Head back to the shop’s main page, or just call — we pick up.
      </p>
      <p className="lost__actions">
        <a className="btn btn--red btn--lg" href={telHref(SHOP.phone.e164)}>
          Call {SHOP.phone.display}
        </a>
        <Link className="link" href="/">
          Back to the main page <span aria-hidden="true">→</span>
        </Link>
      </p>
    </main>
  );
}
