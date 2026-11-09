"use client";

import { useCallback, useEffect, useState } from "react";

type Slot = {
  id: string;
  provider: string;
  start: string;
  end: string;
  available: boolean;
};

type Booking = {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
};

const apiKey = process.env.NEXT_PUBLIC_API_KEY ?? "";

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingApp() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { ok, data } = await api<{ slots: Slot[] }>("/slots");
    if (!ok) {
      setError("Could not load slots. Check API key configuration.");
      setSlots([]);
    } else {
      setSlots(data.slots);
      setSelectedId((current) => {
        if (current && data.slots.some((s) => s.id === current && s.available)) {
          return current;
        }
        return data.slots.find((s) => s.available)?.id ?? "";
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setConfirmation(null);

    const { ok, status, data } = await api<Booking | { error: string }>(
      "/bookings",
      {
        method: "POST",
        body: JSON.stringify({
          slot_id: selectedId,
          name,
          email,
        }),
      },
    );

    setSubmitting(false);

    if (!ok) {
      const message =
        "error" in data ? data.error : `Booking failed (${status})`;
      setError(message);
      return;
    }

    setConfirmation(data as Booking);
    await loadSlots();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-teal-700">Koya Clinic</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Book an appointment
        </h1>
        <p className="text-slate-600">
          Pick an open slot, enter your details, and confirm your booking.
        </p>
      </header>

      {loading ? (
        <p className="text-slate-500">Loading slots…</p>
      ) : slots.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          No slots yet. Run the seed script or POST /reset with slots for
          assessors.
        </p>
      ) : (
        <form onSubmit={handleBook} className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">
              Available slots
            </legend>
            <ul className="space-y-2">
              {slots.map((slot) => (
                <li key={slot.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      slot.available
                        ? "border-slate-200 hover:border-teal-400"
                        : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={slot.id}
                      disabled={!slot.available}
                      checked={selectedId === slot.id}
                      onChange={() => setSelectedId(slot.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium text-slate-900">
                        {slot.provider}
                      </span>
                      <span className="block text-sm text-slate-600">
                        {formatWhen(slot.start)} – {formatWhen(slot.end)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {slot.available ? "Open" : "Booked"}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-700">Full name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Ada Obi"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="ada@example.com"
              />
            </label>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedId}
            className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {submitting ? "Booking…" : "Confirm booking"}
          </button>
        </form>
      )}

      {confirmation && (
        <section className="rounded-xl border border-teal-200 bg-teal-50 p-6 text-teal-950">
          <h2 className="text-lg font-semibold">You&apos;re booked</h2>
          <p className="mt-2 text-sm">
            Booking <strong>{confirmation.id}</strong> for{" "}
            <strong>{confirmation.name}</strong> ({confirmation.email}).
          </p>
          <p className="mt-1 text-sm text-teal-800">Status: confirmed</p>
        </section>
      )}
    </main>
  );
}
