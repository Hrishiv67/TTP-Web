"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { SHOP } from "@/lib/business";
import { ALL_SERVICES, COPY } from "@/lib/copy";
import { quoteMessage, smsHref, telHref, type QuoteRequest } from "@/lib/quote";
import { KeepTogether } from "./KeepTogether";

const C = COPY.quote;
const F = C.fields;

const EMPTY: QuoteRequest = {
  name: "",
  vehicle: C.vehicles[0],
  service: COPY.services.main[0].name,
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
    const body = quoteMessage(form, COPY.sms.greeting);
    const href = smsHref(SHOP.phone.e164, body);
    setSent({ body, href });
    setCopied(false);
    // hand off to the messages app; the panel below covers computers that have none
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

  // a label with an optional hint line under it, tied to the input for screen readers
  const label = (name: string, f: { label: string; hint?: string }) => (
    <>
      <label htmlFor={id(name)}>{f.label}</label>
      {f.hint ? (
        <span className="field__hint" id={id(`${name}-hint`)}>
          <KeepTogether text={f.hint} />
        </span>
      ) : null}
    </>
  );
  const described = (name: string, f: { hint?: string }) => (f.hint ? { "aria-describedby": id(`${name}-hint`) } : {});

  return (
    <form className="qf" onSubmit={onSubmit} noValidate>
      <div className="qf__grid">
        <div className="field">
          {label("name", F.name)}
          <input id={id("name")} name="name" autoComplete="given-name" value={form.name} onChange={set("name")} {...described("name", F.name)} />
        </div>
        <div className="field">
          {label("size", F.size)}
          <input
            id={id("size")}
            name="size"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            value={form.size}
            onChange={set("size")}
            {...described("size", F.size)}
          />
        </div>
        <div className="field">
          {label("vehicle", F.vehicle)}
          <select id={id("vehicle")} name="vehicle" value={form.vehicle} onChange={set("vehicle")}>
            {C.vehicles.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="field">
          {label("service", F.service)}
          <select id={id("service")} name="service" value={form.service} onChange={set("service")}>
            {ALL_SERVICES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="seg">
        <legend>{F.position.label}</legend>
        <div className="seg__options">
          {[...C.positions, F.position.notSure].map((p) => (
            <label key={p} className="seg__option">
              <input type="radio" name="position" value={p} checked={form.position === p} onChange={set("position")} />
              <span>{p}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="qf__grid">
        <div className="field">
          {label("quantity", F.quantity)}
          <input id={id("quantity")} name="quantity" type="number" inputMode="numeric" min={1} max={18} value={form.quantity} onChange={set("quantity")} />
        </div>
        <div className="field">
          {label("location", F.location)}
          <input id={id("location")} name="location" value={form.location} onChange={set("location")} {...described("location", F.location)} />
        </div>
      </div>

      <div className="field">
        {label("notes", F.notes)}
        <textarea id={id("notes")} name="notes" rows={3} value={form.notes} onChange={set("notes")} {...described("notes", F.notes)} />
      </div>

      <div className="qf__actions">
        <button type="submit" className="btn">
          {C.submit}
        </button>
        <p className="t-small">{C.fine}</p>
      </div>

      {sent ? (
        <div className="qf__result" ref={result} tabIndex={-1} role="status">
          <p className="t-h3">{C.result.heading}</p>
          <p>{C.result.body}</p>
          <pre className="qf__preview">{sent.body}</pre>
          <div className="qf__resultActions">
            <a className="link" href={sent.href}>
              {C.result.again}
            </a>
            <button type="button" className="link" onClick={copy}>
              {copied ? C.result.copied : C.result.copy}
            </button>
            <a className="link" href={telHref(SHOP.phone.e164)}>
              {C.result.call}
            </a>
          </div>
        </div>
      ) : null}
    </form>
  );
}
