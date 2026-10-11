import { SECOND_LOCATION, SHOP, directionsUrl, mapEmbedUrl, oneLine } from "@/lib/business";
import { telHref } from "@/lib/quote";
import { HoursTable } from "./HoursTable";
import { PinIcon } from "./icons";
import { LiveStatus } from "./LiveStatus";
import { SectionHead } from "./SectionHead";

export function Locations() {
  return (
    <section className="section" id="locations" aria-labelledby="locations-title">
      <div className="wrap">
        <SectionHead id="locations-title" index="06" label="Locations & hours" title="Come by the shop." />
        <div className="loc">
          <div className="loc__info">
            <p className="label loc__kicker">Main shop · Dunn</p>
            <address className="display-m loc__address">
              {SHOP.address.street}
              <br />
              {SHOP.address.city}, {SHOP.address.region} {SHOP.address.postalCode}
            </address>
            <p className="loc__contact">
              <a className="heading-s" href={telHref(SHOP.phone.e164)}>
                {SHOP.phone.display}
              </a>
              <a className="link" href={directionsUrl(SHOP.address)} target="_blank" rel="noopener noreferrer">
                Get directions <span aria-hidden="true">↗</span>
              </a>
            </p>
            <LiveStatus className="loc__status" />
            <HoursTable />
          </div>
          <div className="loc__map">
            <div className="loc__fallback">
              <PinIcon size={28} />
              <a className="link" href={directionsUrl(SHOP.address)} target="_blank" rel="noopener noreferrer">
                Open in Google Maps <span aria-hidden="true">↗</span>
              </a>
            </div>
            <iframe
              title={`Map showing ${SHOP.name} at ${oneLine(SHOP.address)}`}
              src={mapEmbedUrl(SHOP.address)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
        <div className="loc2">
          <p className="label loc__kicker">Second location · {SECOND_LOCATION.label}</p>
          <address className="heading-s">{oneLine(SECOND_LOCATION.address)}</address>
          <p>
            <a href={telHref(SECOND_LOCATION.phone.e164)}>{SECOND_LOCATION.phone.display}</a> · Call ahead for hours
          </p>
          <a className="link" href={directionsUrl(SECOND_LOCATION.address)} target="_blank" rel="noopener noreferrer">
            Get directions <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
