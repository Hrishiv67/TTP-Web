"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { ALL_SERVICES, POSITIONS, SHOP, VEHICLES } from "@/lib/business";
import { quoteMessage, smsHref, telHref, type QuoteRequest } from "@/lib/quote";

const EMPTY: QuoteRequest = {
  name: "",
  vehicle: VEHICLES[0],
  service: ALL_SERVICES[0],
  position: "",
  size: "",
  quantity: "",
  location: "",
  notes: "",
};

export function QuoteForm() {
  const [form, setForm] = useState<QuoteRequest>(EMPTY);
  const [sent, setSent] = useState<{ body: string; href: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const result = useRef<HTMLDivElement>(null);
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const set = (key: keyof QuoteRequest) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const body = quoteMessage(form, SHOP.name);
    const href = smsHref(SHOP.phone.e164, body);
    setSent({ body, href });
    setCopied(false);
    // hand off to the messages app; the panel below covers desktops that have none
    window.location.href = href;
    requestAnimationFrame(() => result.current?.focus());
  };

  const copy = async () => {
    if (!sent) return;
    try {
      await navigator.clipboard.writeText(sent.body);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <form className="qf" onSubmit={onSubmit} noValidate>
      <div className="qf__grid">
        <div className="field">
          <label htmlFor={id("name")}>Your name</label>
          <input id={id("name")} name="name" autoComplete="given-name" placeholder="First name is fine" value={form.name} onChange={set("name")} />
        </div>
        <div className="field field--select">
          <label htmlFor={id("vehicle")}>Vehicle</label>
          <select id={id("vehicle")} name="vehicle" value={form.vehicle} onChange={set("vehicle")}>
            {VEHICLES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="field field--select">
          <label htmlFor={id("service")}>What do you need?</label>
          <select id={id("service")} name="service" value={form.service} onChange={set("service")}>
            {ALL_SERVICES.map((s) => (
              <option key={s}>{s}</option>
            ))}
            <option>Not sure yet</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={id("size")}>Tire size</label>
          <input
            id={id("size")}
            name="size"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g. 295/75R22.5"
            value={form.size}
            onChange={set("size")}
          />
        </div>
      </div>

      <fieldset className="seg">
        <legend>Tire position</legend>
        <div className="seg__options">
          {[...POSITIONS.map((p) => p.name), "Not sure"].map((p) => (
            <label key={p} className="seg__option">
              <input type="radio" name="position" value={p} checked={form.position === p} onChange={set("position")} />
              <span>{p}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="qf__grid">
        <div className="field">
          <label htmlFor={id("quantity")}>How many?</label>
          <input id={id("quantity")} name="quantity" type="number" inputMode="numeric" min={1} max={18} placeholder="2" value={form.quantity} onChange={set("quantity")} />
        </div>
        <div className="field">
          <label htmlFor={id("location")}>Where are you?</label>
          <input id={id("location")} name="location" placeholder="At the shop / on the road near…" value={form.location} onChange={set("location")} />
        </div>
      </div>

      <div className="field">
        <label htmlFor={id("notes")}>Anything else</label>
        <textarea id={id("notes")} name="notes" rows={3} placeholder="What happened, when you need it" value={form.notes} onChange={set("notes")} />
      </div>

      <div className="qf__actions">
        <button type="submit" className="btn btn--red btn--lg">
          Open text message <span aria-hidden="true">→</span>
        </button>
        <p className="qf__fine">
          Opens your messages app with this filled in. Nothing is sent until you hit send. Standard messaging rates
          apply.
        </p>
      </div>

      {sent ? (
        <div className="qf__result" ref={result} tabIndex={-1} role="status">
          <p className="label">Your text is ready</p>
          <p>
            Your messages app should have opened with this message to {SHOP.phone.display}. On a computer without
            one? Copy it, or just call.
          </p>
          <pre className="qf__preview">{sent.body}</pre>
          <div className="qf__resultActions">
            <a className="link link--paper" href={sent.href}>
              Open messages again <span aria-hidden="true">→</span>
            </a>
            <button type="button" className="link link--paper" onClick={copy}>
              {copied ? "Copied" : "Copy text"}
            </button>
            <a className="link link--paper" href={telHref(SHOP.phone.e164)}>
              Call {SHOP.phone.display}
            </a>
          </div>
        </div>
      ) : null}
    </form>
  );
}
