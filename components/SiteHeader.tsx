"use client";

import { useEffect, useRef, useState } from "react";
import { NAV, SHOP, oneLine } from "@/lib/business";
import { telHref } from "@/lib/quote";
import { LiveStatus } from "./LiveStatus";
import { PhoneIcon } from "./icons";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

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

  // the overlay only exists below the desktop breakpoint; don't strand it open on resize
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <aside className="util" aria-label="Shop status and phone">
        <div className="wrap util__inner">
          <LiveStatus className="util__status util__status--long" />
          <LiveStatus compact className="util__status util__status--short" />
          <p className="util__contact">
            <span className="util__address">{oneLine(SHOP.address)}</span>
            <a href={telHref(SHOP.phone.e164)}>{SHOP.phone.display}</a>
          </p>
        </div>
      </aside>

      <header className="masthead">
        <div className="wrap masthead__inner">
          <a className="masthead__logo" href="#top" aria-label={`${SHOP.name} — back to top`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static vector, no optimisation to gain */}
            <img src="/logo.svg" alt="" width={1022} height={784} />
          </a>

          <nav className="masthead__nav" aria-label="Sections">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <a className="btn btn--red masthead__call" href={telHref(SHOP.phone.e164)}>
            <PhoneIcon />
            <span>
              <span className="masthead__callWord">Call </span>
              {SHOP.phone.display}
            </span>
          </a>

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

      <div
        ref={panel}
        id="site-menu"
        className="menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        hidden={!open}
      >
        <div className="menu__top">
          {/* eslint-disable-next-line @next/next/no-img-element -- static vector */}
          <img className="menu__logo" src="/logo-reverse.svg" alt="" width={1022} height={784} />
          <button type="button" className="menu__close" onClick={() => setOpen(false)}>
            Close <span aria-hidden="true">✕</span>
          </button>
        </div>
        <nav aria-label="Sections">
          <ol className="menu__list">
            {NAV.map((item, i) => (
              <li key={item.href}>
                <a ref={i === 0 ? firstLink : undefined} href={item.href} onClick={() => setOpen(false)}>
                  <span className="menu__num">{String(i + 1).padStart(2, "0")}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="menu__foot">
          <p>{oneLine(SHOP.address)}</p>
          <p>Mon–Fri 8 AM – 5 PM · Sat–Sun closed</p>
          <a className="btn btn--red" href={telHref(SHOP.phone.e164)}>
            <PhoneIcon />
            <span>Call {SHOP.phone.display}</span>
          </a>
        </div>
      </div>
    </>
  );
}
