import Image from "next/image";
import { SHOP, directionsUrl, mapEmbedUrl, oneLine } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { HoursTable } from "./HoursTable";

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
            <Image
              className="loc__photo"
              src="https://lh3.googleusercontent.com/gps-cs-s/ANWiy9QeDHWWXPa6vQdpNq63y_jowlUQta9VS4FTWS9Z7swA0iOXaKgbOm7KGyEvEXDOcuNqf5Zww4zTAVqd-oJlT6xs6SxmidGI_lbT5KmXd7lU3viNFD9_Dn-AmsklXLoVewXjwH8Dow=s1360-w1360-h1020-rw"
              alt="Truck Tire Pro's gray and red shop in Dunn, with two open service bays and the TTP sign"
              width={1360}
              height={1020}
              sizes="(max-width: 900px) 100vw, 42vw"
              unoptimized
            />
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
              <h3 className="t-h3">{c.hoursHeading}</h3>
              <HoursTable />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
