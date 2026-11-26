"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppointmentDTO, Paginated } from "@/lib/types";

const STATUSES = ["all", "pending", "confirmed", "completed", "cancelled"];

export function MyAppointments({
  initial,
  status,
}: {
  initial: Paginated<AppointmentDTO>;
  status: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial.items);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [reviewOpenId, setReviewOpenId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function cancel(appointment: AppointmentDTO) {
    setError("");
    setBusyId(appointment.id);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: "Cancelled by customer" }),
      });
      const data = (await response.json()) as {
        appointment?: AppointmentDTO;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Could not cancel");
      setItems((current) =>
        current.map((item) =>
          item.id === appointment.id ? data.appointment! : item,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setBusyId("");
    }
  }

  async function submitReview(appointment: AppointmentDTO) {
    setError("");
    setBusyId(appointment.id);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appointment.id, rating, comment }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not submit review");
      setItems((current) =>
        current.map((item) =>
          item.id === appointment.id ? { ...item, hasReview: true } : item,
        ),
      );
      setReviewOpenId("");
      setComment("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section>
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">My bookings</h1>
      <p className="mb-5 text-sm text-slate-500">Track and manage your appointments.</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              router.push(value === "all" ? "/appointments" : `/appointments?status=${value}`)
            }
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
              status === value
                ? "bg-[#7c3aed] text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">No appointments here yet</p>
          <p className="mt-1 text-sm text-slate-500">Explore businesses to book one.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((appointment) => (
            <li
              key={appointment.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">
                    {appointment.serviceName} at {appointment.businessName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(appointment.start).toLocaleString()} · {appointment.durationMin} min · $
                    {appointment.price}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                  {appointment.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                {(appointment.status === "pending" || appointment.status === "confirmed") && (
                  <button
                    type="button"
                    disabled={busyId === appointment.id}
                    onClick={() => cancel(appointment)}
                    className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                  >
                    Cancel booking
                  </button>
                )}
                {appointment.status === "completed" && (
                  <div className="flex flex-wrap items-center gap-2">
                    {appointment.hasReview ? (
                      <span className="text-xs text-slate-500">You reviewed this visit</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setReviewOpenId(appointment.id)}
                          className="rounded-full border border-[#7c3aed] px-3 py-1.5 text-xs font-semibold text-[#7c3aed]"
                        >
                          Write a review
                        </button>
                        {reviewOpenId === appointment.id && (
                          <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-2">
                            <select
                              aria-label="Rating"
                              value={rating}
                              onChange={(event) => setRating(Number(event.target.value))}
                              className="rounded border border-slate-300 px-2 py-1 text-sm"
                            >
                              {[5, 4, 3, 2, 1].map((value) => (
                                <option key={value} value={value}>
                                  {value} stars
                                </option>
                              ))}
                            </select>
                            <input
                              aria-label="Review comment"
                              placeholder="How was it?"
                              value={comment}
                              onChange={(event) => setComment(event.target.value)}
                              className="rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                            <button
                              type="button"
                              disabled={busyId === appointment.id}
                              onClick={() => submitReview(appointment)}
                              className="rounded-full bg-[#7c3aed] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Submit
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {appointment.cancelReason && (
                  <span className="text-xs text-slate-400">Reason: {appointment.cancelReason}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
