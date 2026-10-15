"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { BOOKING, HOURS, SHOP, TIME_ZONE } from "@/lib/business";
import { bookingSummary, openDays, slotsFor, validPhone, type BookingRequest } from "@/lib/booking";
import { DAY_NAMES, formatRange } from "@/lib/hours";
import { ALL_SERVICES, COPY } from "@/lib/copy";
import { smsHref, telHref } from "@/lib/quote";
import { KeepTogether } from "./KeepTogether";
import { useNow } from "@/lib/useNow";

const C = COPY.booking;
const F = C.fields;

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; phone: string; day: string; time: string } | { kind: "failed"; sms: string };

export function BookingForm() {
  const now = useNow();
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const [service, setService] = useState("");
  const [vehicle, setVehicle] = useState<string>(COPY.quote.vehicles[0]);
  const [size, setSize] = useState("");
  const [dayIso, setDayIso] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof typeof C.errors, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const result = useRef<HTMLDivElement>(null);
  const firstError = useRef<HTMLElement | null>(null);

  // open days and times depend on the shop's clock, so they only exist in the browser
  const days = useMemo(() => (now === null ? [] : openDays(new Date(now), HOURS, TIME_ZONE, BOOKING)), [now]);
  const day = days.find((d) => d.iso === dayIso);
  const slots = useMemo(() => (day && now !== null ? slotsFor(day, new Date(now), HOURS, TIME_ZONE, BOOKING) : []), [day, now]);
  const slot = slots.find((s) => s.value === time);

  // if the clock moves on past the chosen day or time, `day` or `slot` comes back empty and
  // the form asks for a new one

  useEffect(() => {
    if (status.kind === "sent" || status.kind === "failed") result.current?.focus();
  }, [status.kind]);

  // links like /book?service=Tire%20repair preselect the service
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("service");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL, which only exists in the browser
    if (wanted && (ALL_SERVICES as readonly string[]).includes(wanted)) setService(wanted);
  }, []);

  const request = (): BookingRequest => ({
    service, vehicle, size, day: day?.short ?? "", time: slot?.label ?? "", name, phone, email, notes,
  });

  const smsBody = () => `${C.smsIntro}\n${bookingSummary(request())}`;

  const validate = () => {
    const e: typeof errors = {};
    if (!service) e.service = C.errors.service;
    if (!day) e.day = C.errors.day;
    if (!slot) e.time = C.errors.time;
    if (!name.trim()) e.name = C.errors.name;
    if (!validPhone(phone)) e.phone = C.errors.phone;
    setErrors(e);
    return e;
  };

  const onSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const e = validate();
    const keys = Object.keys(e);
    if (keys.length) {
      const el = ev.currentTarget.querySelector<HTMLElement>(`[data-field="${keys[0]}"]`);
      el?.focus();
      firstError.current = el;
      return;
    }
    const r = request();
    setStatus({ kind: "sending" });
    const honeypot = (ev.currentTarget.elements.namedItem("botcheck") as HTMLInputElement | null)?.checked ?? false;
    try {
      const res = await fetch(BOOKING.endpoint + BOOKING.email, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `Appointment request: ${r.service}, ${r.day} at ${r.time}`,
          _template: "table",
          // FormSubmit drops anything with this filled in, which only bots do
          _honey: honeypot ? "on" : "",
          Service: r.service,
          Vehicle: r.vehicle,
          "Tire size": r.size.toUpperCase() || "Not given",
          Day: r.day,
          Time: r.time,
          Name: r.name.trim(),
          Phone: r.phone.trim(),
          // FormSubmit makes a field called "email" the reply-to address, so the shop can
          // answer the customer straight from the booking email
          ...(r.email.trim() ? { email: r.email.trim() } : {}),
          Notes: r.notes.trim() || "None",
        }),
      });
      // FormSubmit answers {"success": "true"} as a string, and "false" (with a message)
      // when the request wasn't delivered, as before the address has been activated
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) !== "true") throw new Error(data.message || `HTTP ${res.status}`);
      setStatus({ kind: "sent", phone: r.phone.trim(), day: r.day, time: r.time });
    } catch {
      setStatus({ kind: "failed", sms: smsHref(SHOP.phone.e164, smsBody()) });
    }
  };

  const reset = () => {
    setDayIso("");
    setTime("");
    setNotes("");
    setStatus({ kind: "idle" });
  };

  if (status.kind === "sent") {
    return (
      <div className="bk__result" ref={result} tabIndex={-1} role="status">
        <h2 className="t-h3">{C.success.heading}</h2>
        <p className="t-lede">
          <KeepTogether text={C.success.body(status.phone, status.day, status.time)} />
        </p>
        <p>
          <button type="button" className="link" onClick={reset}>
            {C.success.another}
          </button>
        </p>
      </div>
    );
  }

  const err = (k: keyof typeof C.errors) =>
    errors[k] ? (
      <span className="field__error" id={id(`${k}-err`)}>
        {errors[k]}
      </span>
    ) : null;
  const describedBy = (k: string, hint?: boolean) =>
    [hint ? id(`${k}-hint`) : "", errors[k as keyof typeof errors] ? id(`${k}-err`) : ""].filter(Boolean).join(" ") || undefined;

  return (
    <form className="bk" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor={id("service")}>{F.service.label}</label>
        <select
          id={id("service")}
          data-field="service"
          value={service}
          onChange={(e) => setService(e.target.value)}
          aria-invalid={!!errors.service}
          aria-describedby={describedBy("service")}
        >
          <option value="" disabled>
            Choose a service
          </option>
          {ALL_SERVICES.map((s) => (
            <option key={s}>{s}</option>
          ))}
          <option>Not sure yet</option>
        </select>
        {err("service")}
      </div>

      <fieldset className="field bk__days" aria-describedby={describedBy("day")}>
        <legend>{F.day.label}</legend>
        {days.length === 0 ? (
          <p className="field__hint">{C.loadingDays}</p>
        ) : (
          <div className="chips">
            {days.map((d, i) => (
              <label key={d.iso} className="chip">
                <input
                  type="radio"
                  name="day"
                  value={d.iso}
                  checked={dayIso === d.iso}
                  onChange={() => {
                    setDayIso(d.iso);
                    setTime("");
                    setErrors((x) => ({ ...x, day: undefined }));
                  }}
                  data-field={i === 0 ? "day" : undefined}
                />
                <span>{d.label}</span>
              </label>
            ))}
          </div>
        )}
        {err("day")}
      </fieldset>

      <fieldset className="field bk__times" aria-describedby={describedBy("time")}>
        <legend>{F.time.label}</legend>
        {!day ? (
          <p className="field__hint">{C.pickDay}</p>
        ) : (
          <div className="chips chips--times">
            {slots.map((s, i) => (
              <label key={s.value} className="chip">
                <input
                  type="radio"
                  name="time"
                  value={s.value}
                  checked={time === s.value}
                  onChange={() => {
                    setTime(s.value);
                    setErrors((x) => ({ ...x, time: undefined }));
                  }}
                  data-field={i === 0 ? "time" : undefined}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        )}
        {day ? (
          <p className="field__hint">
            {DAY_NAMES[day.weekday]} hours: {formatRange(HOURS[day.weekday])}
          </p>
        ) : null}
        {err("time")}
      </fieldset>

      <div className="qf__grid">
        <div className="field">
          <label htmlFor={id("vehicle")}>{F.vehicle.label}</label>
          <select id={id("vehicle")} value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
            {COPY.quote.vehicles.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={id("size")}>{F.size.label}</label>
          <span className="field__hint" id={id("size-hint")}>
            {F.size.hint}
          </span>
          <input
            id={id("size")}
            value={size}
            onChange={(e) => setSize(e.target.value)}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={id("size-hint")}
          />
        </div>
        <div className="field">
          <label htmlFor={id("name")}>{F.name.label}</label>
          <span className="field__hint" id={id("name-hint")}>
            {F.name.hint}
          </span>
          <input
            id={id("name")}
            data-field="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={describedBy("name", true)}
          />
          {err("name")}
        </div>
        <div className="field">
          <label htmlFor={id("phone")}>{F.phone.label}</label>
          <span className="field__hint" id={id("phone-hint")}>
            {F.phone.hint}
          </span>
          <input
            id={id("phone")}
            data-field="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={!!errors.phone}
            aria-describedby={describedBy("phone", true)}
          />
          {err("phone")}
        </div>
      </div>

      <div className="field">
        <label htmlFor={id("email")}>{F.email.label}</label>
        <span className="field__hint" id={id("email-hint")}>
          {F.email.hint}
        </span>
        <input id={id("email")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={id("email-hint")} />
      </div>

      <div className="field">
        <label htmlFor={id("notes")}>{F.notes.label}</label>
        <span className="field__hint" id={id("notes-hint")}>
          {F.notes.hint}
        </span>
        <textarea id={id("notes")} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} aria-describedby={id("notes-hint")} />
      </div>

      {/* spam trap: people never see or tick this */}
      <input type="checkbox" name="botcheck" className="bk__trap" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <div className="qf__actions">
        <button type="submit" className="btn" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? C.sending : C.submit}
        </button>
      </div>

      {status.kind === "failed" ? (
        <div className="bk__result bk__result--failed" ref={result} tabIndex={-1} role="alert">
          <p className="t-h3">{C.failed.heading}</p>
          <p>
            <KeepTogether text={C.failed.body} />
          </p>
          <p className="bk__resultActions">
            <a className="btn" href={status.sms}>
              {C.failed.text}
            </a>
            <a className="link" href={telHref(SHOP.phone.e164)}>
              {C.failed.call}
            </a>
          </p>
        </div>
      ) : null}
    </form>
  );
}
