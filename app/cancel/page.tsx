import type { Metadata } from "next";
import { CancelBooking } from "@/components/CancelBooking";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { COPY } from "@/lib/copy";

const C = COPY.cancel;

export const metadata: Metadata = {
  title: C.title,
  robots: { index: false, follow: false },
};

/** Where the "Free up this time" link in a booking email leads. */
export default function CancelPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="cancelpage">
        <div className="wrap cancelpage__body">
          <h1 className="t-h2">{C.heading}</h1>
          <CancelBooking />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
