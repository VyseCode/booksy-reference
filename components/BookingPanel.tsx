"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AppointmentDTO, ServiceDTO, SlotDTO } from "@/lib/types";

function tomorrow(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function timeOf(iso: string): string {
  return iso.slice(11, 16);
}

export function BookingPanel({
  businessId,
  services,
}: {
  businessId: string;
  services: ServiceDTO[];
}) {
  const router = useRouter();
  const bookable = services.filter((service) => service.active);
  const [serviceId, setServiceId] = useState(bookable[0]?.id ?? "");
  const [date, setDate] = useState(tomorrow);
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSlots() {
    if (!serviceId || !date) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const response = await fetch(
        `/api/businesses/${businessId}/slots?date=${date}&serviceId=${serviceId}`,
      );
      const data = (await response.json()) as { slots?: SlotDTO[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load slots");
      setSlots(data.slots ?? []);
      setSelected("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load slots");
      setSlots([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, date]);

  async function book() {
    if (!selected) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, serviceId, start: selected }),
      });
      const data = (await response.json()) as {
        appointment?: AppointmentDTO;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Booking failed");
      setSuccess(`Booked for ${new Date(data.appointment!.start).toLocaleString()}.`);
      await loadSlots();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  if (bookable.length === 0) {
    return <p className="text-sm text-slate-500">No bookable services yet.</p>;
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Service</label>
          <select
            aria-label="Service to book"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {bookable.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.durationMin} min · ${service.price}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Date (UTC)
          </label>
          <input
            aria-label="Booking date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={loadSlots}
        disabled={busy}
        className="mb-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
      >
        Refresh availability
      </button>

      {slots.length === 0 ? (
        <p className="text-sm text-slate-500">
          {busy ? "Loading slots..." : "No available slots for this date."}
        </p>
      ) : (
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {slots.map((slot) => (
            <button
              key={slot.start}
              type="button"
              onClick={() => setSelected(slot.start)}
              className={`rounded-md border px-2 py-2 text-sm font-medium ${
                selected === slot.start
                  ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-[#7c3aed]"
              }`}
            >
              {timeOf(slot.start)}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </p>
      )}

      <button
        type="button"
        onClick={book}
        disabled={!selected || busy}
        className="w-full rounded-full bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {selected ? `Book ${timeOf(selected)}` : "Select a time first"}
      </button>
    </div>
  );
}
