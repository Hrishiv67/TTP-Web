"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTime } from "@/lib/hours";
import { COPY } from "@/lib/copy";

const C = COPY.cancel;

type Ref = { slot: string; id: string; sig: string };
type State =
  | { kind: "loading" }
  | { kind: "found"; ref: Ref; when: string; who: string }
  | { kind: "freeing"; ref: Ref; when: string; who: string }
  | { kind: "done"; when: string }
  | { kind: "gone" }
  | { kind: "invalid" }
  | { kind: "error" };

/** "2026-10-16T08:00" as "Friday, October 16 at 8 AM". */
function describe(slot: string) {
  const [y, mo, d, h, m] = slot.split(/[-T:]/).map(Number);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(new Date(Date.UTC(y, mo - 1, d, 12)));
  return `${date} at ${formatTime(h * 60 + m)}`;
}

/**
 * Behind the "Free up this time" link in each booking email: shows which booking the link
 * is for and frees that place when the shop confirms. It asks first, so email apps that
 * open links on their own can't cancel anything.
 */
export function CancelBooking() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ref = { slot: q.get("slot") ?? "", id: q.get("id") ?? "", sig: q.get("sig") ?? "" };
    fetch(`/api/release?${new URLSearchParams(ref)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (data.ok && data.booking) setState({ kind: "found", ref, when: describe(ref.slot), who: C.who(data.booking.name, data.booking.service) });
        else if (data.ok) setState({ kind: "gone" });
        else setState({ kind: res.status === 503 ? "error" : "invalid" });
      })
      .catch(() => setState({ kind: "error" }));
  }, []);

  const free = async () => {
    if (state.kind !== "found") return;
    setState({ ...state, kind: "freeing" });
    try {
      const res = await fetch("/api/release", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state.ref) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.reason);
      setState(data.removed ? { kind: "done", when: state.when } : { kind: "gone" });
    } catch {
      setState({ kind: "error" });
    }
  };

  if (state.kind === "loading") return <p className="t-lede">{C.loading}</p>;
  if (state.kind === "found" || state.kind === "freeing") {
    return (
      <>
        <p className="t-lede">{C.ask(state.when)}</p>
        <p>{state.who}</p>
        <button type="button" className="btn" onClick={free} disabled={state.kind === "freeing"}>
          {state.kind === "freeing" ? C.freeing : C.confirm}
        </button>
      </>
    );
  }
  const message = state.kind === "done" ? C.done(state.when) : C[state.kind];
  return (
    <>
      <p className="t-lede" role="status">
        {message}
      </p>
      <Link className="link" href="/">
        {C.back}
      </Link>
    </>
  );
}
