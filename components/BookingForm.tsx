"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { BOOKING, HOURS, SHOP, TIME_ZONE } from "@/lib/business";
import { bookingSummary, openDays, slotsFor, validEmail, validPhone, type BookingRequest } from "@/lib/booking";
import { DAY_NAMES, formatRange } from "@/lib/hours";
import { ALL_SERVICES, COPY } from "@/lib/copy";
import { smsHref, telHref } from "@/lib/quote";
import { slotKey } from "@/lib/slots";
import { KeepTogether } from "./KeepTogether";
import { useNow } from "@/lib/useNow";

const C = COPY.booking;
const F = C.fields;

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; phone: string; day: string; time: string } | { kind: "failed"; sms: string };
/** A place held at a time by /api/book; `checked` is false when the bookings couldn't be checked. */
type Hold = { checked: boolean; slot?: string; id?: string; sig?: string };

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
  // times that already have as many trucks as the shop takes (BOOKING.perSlot)
  const [full, setFull] = useState<ReadonlySet<string>>(new Set());

  const loadFull = useCallback(async () => {
    try {
      const data = await (await fetch("/api/slots", { cache: "no-store" })).json();
      setFull(new Set(Array.isArray(data.full) ? data.full : []));
    } catch {
      // without the list every time looks open; holding a place still checks
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches the booked times once, in the browser
    void loadFull();
  }, [loadFull]);

  // open days and times depend on the shop's clock, so they only exist in the browser
  const days = useMemo(() => (now === null ? [] : openDays(new Date(now), HOURS, TIME_ZONE, BOOKING)), [now]);
  const fullDays = useMemo(
    () => new Set(now === null ? [] : days.filter((d) => slotsFor(d, new Date(now), HOURS, TIME_ZONE, BOOKING).every((s) => full.has(slotKey(d.iso, s.value)))).map((d) => d.iso)),
    [days, full, now],
  );
  const day = days.find((d) => d.iso === dayIso && !fullDays.has(d.iso));
  const slots = useMemo(() => (day && now !== null ? slotsFor(day, new Date(now), HOURS, TIME_ZONE, BOOKING) : []), [day, now]);
  const isFull = (value: string) => !!day && full.has(slotKey(day.iso, value));
  const slot = slots.find((s) => s.value === time && !isFull(s.value));

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
    if (email.trim() && !validEmail(email)) e.email = C.errors.email;
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
    const form = ev.currentTarget;
    const r = request();
    setStatus({ kind: "sending" });
    const honeypot = (form.elements.namedItem("botcheck") as HTMLInputElement | null)?.checked ?? false;

    // hold a place at the time first, so it can't fill up while the email goes out
    let hold: Hold = { checked: false };
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: dayIso, time, name: r.name, phone: r.phone, service: r.service }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 || data.reason === "unavailable") {
        // taken (or passed) since the page loaded: ask for another time
        setStatus({ kind: "idle" });
        setTime("");
        setErrors({ time: C.taken });
        await loadFull();
        requestAnimationFrame(() => form.querySelector<HTMLElement>('[data-field="time"]')?.focus());
        return;
      }
      if (res.ok && data.ok) hold = data;
    } catch {
      // the check couldn't be reached: send the booking anyway, marked unchecked
    }
    const freeLink = hold.checked && hold.slot && hold.id && hold.sig ? `${window.location.origin}/cancel?${new URLSearchParams({ slot: hold.slot, id: hold.id, sig: hold.sig })}` : "";

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
          ...(freeLink ? { [C.freeLink]: freeLink } : { [C.uncheckedLabel]: C.unchecked }),
        }),
      });
      // FormSubmit answers {"success": "true"} as a string, and "false" (with a message)
      // when the request wasn't delivered, as before the address has been activated
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) !== "true") throw new Error(data.message || `HTTP ${res.status}`);
      setStatus({ kind: "sent", phone: r.phone.trim(), day: r.day, time: r.time });
      void loadFull();
    } catch {
      // the shop never got it, so don't keep the place
      if (hold.id) {
        void fetch("/api/release", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot: hold.slot, id: hold.id, sig: hold.sig }),
        }).catch(() => {});
      }
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
            {days.map((d) => {
              const dayFull = fullDays.has(d.iso);
              return (
                <label key={d.iso} className="chip">
                  <input
                    type="radio"
                    name="day"
                    value={d.iso}
                    checked={dayIso === d.iso && !dayFull}
                    disabled={dayFull}
                    onChange={() => {
                      setDayIso(d.iso);
                      setTime("");
                      setErrors((x) => ({ ...x, day: undefined }));
                    }}
                    data-field={d.iso === days.find((x) => !fullDays.has(x.iso))?.iso ? "day" : undefined}
                  />
                  <span>
                    {d.label}
                    {dayFull ? <em className="chip__full">{C.full}</em> : null}
                  </span>
                </label>
              );
            })}
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
            {slots.map((s) => {
              const taken = isFull(s.value);
              return (
                <label key={s.value} className="chip">
                  <input
                    type="radio"
                    name="time"
                    value={s.value}
                    checked={time === s.value && !taken}
                    disabled={taken}
                    onChange={() => {
                      setTime(s.value);
                      setErrors((x) => ({ ...x, time: undefined }));
                    }}
                    data-field={s.value === slots.find((x) => !isFull(x.value))?.value ? "time" : undefined}
                  />
                  <span>
                    {s.label}
                    {taken ? <em className="chip__full">{C.full}</em> : null}
                  </span>
                </label>
              );
            })}
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
        <input
          id={id("email")}
          type="email"
          autoComplete="email"
          data-field="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={describedBy("email", true)}
        />
        {err("email")}
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
