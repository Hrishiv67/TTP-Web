import { SHOP, directionsUrl } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { CalendarIcon, PhoneIcon, PinIcon } from "./icons";

/** Phones only: a quote by phone, booking and directions, always within reach of a thumb. */
export function ActionBar() {
  const c = COPY.actionBar;
  return (
    <nav className="actionbar" aria-label="Quick contact">
      <a className="actionbar__call" href={telHref(SHOP.phone.e164)} aria-label={`${c.quote}: call ${SHOP.phone.display}`}>
        <PhoneIcon size={16} />
        {c.quote}
      </a>
      <a href="/book">
        <CalendarIcon size={16} />
        {c.book}
      </a>
      <a href={directionsUrl(SHOP.address)} target="_blank" rel="noopener noreferrer">
        <PinIcon size={16} />
        {c.directions}
      </a>
    </nav>
  );
}
