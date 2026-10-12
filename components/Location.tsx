import { SECOND_LOCATION, SHOP, directionsUrl, mapEmbedUrl, oneLine } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { HoursTable } from "./HoursTable";
import { KeepTogether } from "./KeepTogether";
import { LiveStatus } from "./LiveStatus";

export function Location() {
  const c = COPY.location;
  return (
    <section className="section" id="location" aria-labelledby="location-title">
      <div className="wrap">
        <div className="head">
          <h2 className="t-h2" id="location-title">
            {c.heading}
          </h2>
        </div>
        <div className="loc">
          <div className="loc__map">
            {/* shows while the map loads, and stays if the embed is blocked */}
            <p className="loc__fallback">
              <a className="link" href={directionsUrl(SHOP.address)} target="_blank" rel="noopener noreferrer">
                {c.openMap}
              </a>
            </p>
            <iframe
              title={`Map showing ${SHOP.name} at ${oneLine(SHOP.address)}`}
              src={mapEmbedUrl(SHOP.address)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="loc__info">
            <div className="loc__block">
              <h3 className="t-h3">{c.dunnLabel}</h3>
              <address>
                {SHOP.address.street}
                <br />
                {SHOP.address.city}, {SHOP.address.region} {SHOP.address.postalCode}
              </address>
              <p className="loc__links">
                <a className="link" href={telHref(SHOP.phone.e164)}>
                  {SHOP.phone.display}
                </a>
                <a className="link" href={directionsUrl(SHOP.address)} target="_blank" rel="noopener noreferrer">
                  {c.directions}
                </a>
              </p>
            </div>
            <div className="loc__block">
              <LiveStatus />
              <HoursTable />
            </div>
            <div className="loc__block loc__second">
              <h3 className="t-h3">{c.fayettevilleLabel}</h3>
              <address>
                {SECOND_LOCATION.address.street}
                <br />
                {SECOND_LOCATION.address.city}, {SECOND_LOCATION.address.region} {SECOND_LOCATION.address.postalCode}
              </address>
              <p>
                <KeepTogether text={c.fayettevilleNote} />
              </p>
              <p className="loc__links">
                <a className="link" href={telHref(SECOND_LOCATION.phone.e164)}>
                  {SECOND_LOCATION.phone.display}
                </a>
                <a className="link" href={directionsUrl(SECOND_LOCATION.address)} target="_blank" rel="noopener noreferrer">
                  {c.directions}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
