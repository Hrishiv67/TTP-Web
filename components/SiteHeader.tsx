"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SHOP, oneLine } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { LiveStatus } from "./LiveStatus";
import { PhoneIcon } from "./icons";

/**
 * Fixed header. It is white-on-black while it sits over the tire sequence (or
 * any element marked data-header="dark") and switches to ink on white after.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<"dark" | "light">("dark");
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const update = () => {
      const h = header.current?.offsetHeight ?? 0;
      const dark = [...document.querySelectorAll<HTMLElement>("[data-header='dark']")].some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= h / 2 && r.bottom > h / 2;
      });
      setTone(dark ? "dark" : "light");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (open) {
      document.documentElement.classList.add("is-locked");
      firstLink.current?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") return setOpen(false);
        if (e.key !== "Tab" || !panel.current) return;
        // keep focus inside the open menu
        const items = panel.current.querySelectorAll<HTMLElement>("a[href], button");
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      window.addEventListener("keydown", onKey);
      wasOpen.current = true;
      return () => {
        window.removeEventListener("keydown", onKey);
        document.documentElement.classList.remove("is-locked");
      };
    }
    if (wasOpen.current) menuButton.current?.focus();
  }, [open]);

  // the menu only exists below the desktop breakpoint; don't strand it open on resize
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1081px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <header ref={header} className="masthead" data-tone={tone}>
        <div className="wrap masthead__inner">
          <Link className="masthead__logo" href="/" aria-label={`${SHOP.name}, home`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static vector, nothing to optimize */}
            <img className="logo-dark" src="/logo-reverse.svg" alt="" width={1022} height={784} />
            {/* eslint-disable-next-line @next/next/no-img-element -- static vector, nothing to optimize */}
            <img className="logo-light" src="/logo.svg" alt="" width={1022} height={784} />
          </Link>

          <nav className="masthead__nav" aria-label="Sections">
            {COPY.nav.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="masthead__ctas">
            <a className="btn btn--sm btn--line masthead__quote" href={telHref(SHOP.phone.e164)} aria-label={`${COPY.cta.quote}: call ${SHOP.phone.display}`}>
              <PhoneIcon size={16} />
              <span>{COPY.cta.quote}</span>
            </a>
            <a className="btn btn--sm masthead__book" href="/book">
              <span className="masthead__bookLong">{COPY.cta.book}</span>
              <span className="masthead__bookShort">{COPY.cta.bookShort}</span>
            </a>
          </div>

          <button
            ref={menuButton}
            type="button"
            className="masthead__menu"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(true)}
          >
            Menu
            <span className="masthead__bars" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div ref={panel} id="site-menu" className="menu" role="dialog" aria-modal="true" aria-label="Site menu" hidden={!open}>
        <div className="menu__top">
          {/* eslint-disable-next-line @next/next/no-img-element -- static vector */}
          <img className="menu__logo" src="/logo-reverse.svg" alt="" width={1022} height={784} loading="lazy" />
          <button type="button" className="menu__close" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <nav aria-label="Sections">
          <ul className="menu__list">
            {COPY.nav.map((item, i) => (
              <li key={item.href}>
                <a ref={i === 0 ? firstLink : undefined} href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="menu__foot">
          <LiveStatus />
          <p>{oneLine(SHOP.address)}</p>
          <p>{COPY.hours.open}</p>
          <div className="menu__ctas">
            <a className="btn" href="/book" onClick={() => setOpen(false)}>
              {COPY.cta.book}
            </a>
            <a className="btn btn--line" href={telHref(SHOP.phone.e164)}>
              <PhoneIcon />
              <span>{COPY.cta.quote}</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
