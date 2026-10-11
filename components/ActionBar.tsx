import { SHOP, directionsUrl } from "@/lib/business";
import { smsHref, telHref } from "@/lib/quote";
import { MessageIcon, PhoneIcon, PinIcon } from "./icons";

/** Phones only: the three things a driver on the shoulder actually needs, always in reach of a thumb. */
export function ActionBar() {
  return (
    <nav className="actionbar" aria-label="Quick contact">
      <a className="actionbar__call" href={telHref(SHOP.phone.e164)}>
        <PhoneIcon size={16} />
        Call
      </a>
      <a href={smsHref(SHOP.phone.e164, `Hi ${SHOP.name}, I need a quote. Tire size: `)}>
        <MessageIcon size={16} />
        Text
      </a>
      <a href={directionsUrl(SHOP.address)} target="_blank" rel="noopener noreferrer">
        <PinIcon size={16} />
        Directions
      </a>
    </nav>
  );
}
