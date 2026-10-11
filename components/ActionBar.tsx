import { SHOP, directionsUrl } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { smsHref, telHref } from "@/lib/quote";
import { MessageIcon, PhoneIcon, PinIcon } from "./icons";

/** Phones only: call, text and directions, always within reach of a thumb. */
export function ActionBar() {
  const c = COPY.actionBar;
  return (
    <nav className="actionbar" aria-label="Quick contact">
      <a className="actionbar__call" href={telHref(SHOP.phone.e164)}>
        <PhoneIcon size={16} />
        {c.call}
      </a>
      <a href={smsHref(SHOP.phone.e164, COPY.sms.actionBarBody)}>
        <MessageIcon size={16} />
        {c.text}
      </a>
      <a href={directionsUrl(SHOP.address)} target="_blank" rel="noopener noreferrer">
        <PinIcon size={16} />
        {c.directions}
      </a>
    </nav>
  );
}
