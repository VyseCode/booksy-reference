"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  AppointmentDTO,
  BusinessWithServices,
  OpeningHourDTO,
  ServiceDTO,
} from "@/lib/types";

const CATEGORIES = ["salon", "barbershop", "clinic", "spa", "fitness", "other"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Revenue = {
  totalRevenue: number;
  completedCount: number;
  byMonth: Array<{ month: string; revenue: number; count: number }>;
};

type Props = {
  businesses: BusinessWithServices[];
  schedule: AppointmentDTO[];
  revenue: Revenue;
};

function defaultHours(): OpeningHourDTO[] {
  return DAYS.map((_, day) => ({
    day,
    open: "09:00",
    close: "18:00",
    closed: day === 0,
  }));
}

async function api<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function OwnerDashboard({ businesses, schedule, revenue }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"businesses" | "schedule" | "revenue">("businesses");
  const [items, setItems] = useState(businesses);
  const [appointments, setAppointments] = useState(schedule);
  const [revenueData, setRevenueData] = useState(revenue);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("salon");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState(defaultHours);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [serviceDurations, setServiceDurations] = useState<Record<string, string>>({});
  const [servicePrices, setServicePrices] = useState<Record<string, string>>({});
  const [serviceBefore, setServiceBefore] = useState<Record<string, string>>({});
  const [serviceAfter, setServiceAfter] = useState<Record<string, string>>({});
  const [policyLead, setPolicyLead] = useState<Record<string, string>>({});
  const [policyCutoff, setPolicyCutoff] = useState<Record<string, string>>({});
  const [photoFiles, setPhotoFiles] = useState<Record<string, File | null>>({});
  const [date, setDate] = useState("");
  const [filterBusiness, setFilterBusiness] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function message(err: unknown) {
    return err instanceof Error ? err.message : "Something went wrong";
  }

  async function createBusiness(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api<{ business: BusinessWithServices }>("/api/businesses", "POST", {
        name,
        category,
        description,
        location,
        images: [],
        openingHours: hours,
      });
      setItems((current) => [data.business, ...current]);
      setName("");
      setDescription("");
      setLocation("");
      setHours(defaultHours());
      router.refresh();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function addService(businessId: string) {
    setError("");
    setBusy(true);
    try {
      const durationMin = Number(serviceDurations[businessId] ?? "30");
      const price = Number(servicePrices[businessId] ?? "0");
      const data = await api<{ service: ServiceDTO }>(
        `/api/businesses/${businessId}/services`,
        "POST",
        {
          name: serviceNames[businessId] ?? "",
          description: "",
          durationMin,
          price,
          bufferBeforeMin: Number(serviceBefore[businessId] ?? "0"),
          bufferAfterMin: Number(serviceAfter[businessId] ?? "0"),
          active: true,
        },
      );
      setItems((current) =>
        current.map((business) =>
          business.id === businessId
            ? { ...business, services: [...business.services, data.service] }
            : business,
        ),
      );
      setServiceNames((current) => ({ ...current, [businessId]: "" }));
      setServiceBefore((current) => ({ ...current, [businessId]: "0" }));
      setServiceAfter((current) => ({ ...current, [businessId]: "0" }));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteService(serviceId: string) {
    setError("");
    try {
      await api(`/api/services/${serviceId}`, "DELETE");
      setItems((current) =>
        current.map((business) => ({
          ...business,
          services: business.services.filter((service) => service.id !== serviceId),
        })),
      );
    } catch (err) {
      setError(message(err));
    }
  }

  async function deleteBusiness(businessId: string) {
    setError("");
    try {
      await api(`/api/businesses/${businessId}`, "DELETE");
      setItems((current) => current.filter((business) => business.id !== businessId));
      router.refresh();
    } catch (err) {
      setError(message(err));
    }
  }

  async function savePolicies(business: BusinessWithServices) {
    setError("");
    setBusy(true);
    try {
      const data = await api<{ business: BusinessWithServices }>(
        `/api/businesses/${business.id}`,
        "PATCH",
        {
          minLeadTimeHours: Number(policyLead[business.id] ?? business.minLeadTimeHours),
          cancellationCutoffHours: Number(
            policyCutoff[business.id] ?? business.cancellationCutoffHours,
          ),
        },
      );
      setItems((current) =>
        current.map((item) => (item.id === business.id ? data.business : item)),
      );
      router.refresh();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(businessId: string) {
    const file = photoFiles[businessId];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch(`/api/businesses/${businessId}/images`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        business?: BusinessWithServices;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      setItems((current) =>
        current.map((item) =>
          item.id === businessId
            ? { ...item, images: data.business?.images ?? item.images }
            : item,
        ),
      );
      setPhotoFiles((current) => ({ ...current, [businessId]: null }));
      router.refresh();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(businessId: string, url: string) {
    const uploadId = url.split("/").pop();
    if (!uploadId) return;
    setError("");
    setBusy(true);
    try {
      const data = await api<{ business: BusinessWithServices }>(
        `/api/businesses/${businessId}/images/${uploadId}`,
        "DELETE",
      );
      setItems((current) =>
        current.map((item) => (item.id === businessId ? data.business : item)),
      );
      router.refresh();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadSchedule() {
    setError("");
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (filterBusiness) params.set("businessId", filterBusiness);
      const data = await api<{ appointments: AppointmentDTO[] }>(
        `/api/owner/appointments?${params.toString()}`,
        "GET",
      );
      setAppointments(data.appointments);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadRevenue() {
    setError("");
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (filterBusiness) params.set("businessId", filterBusiness);
      const data = await api<Revenue>(`/api/owner/revenue?${params.toString()}`, "GET");
      setRevenueData(data);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Owner workspace</h1>
      <p className="mb-5 text-sm text-slate-500">
        Manage businesses, services, your schedule and revenue.
      </p>

      <div className="mb-5 flex gap-2 border-b border-slate-200">
        {(["businesses", "schedule", "revenue"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${
              tab === value
                ? "border-[#7c3aed] text-[#7c3aed]"
                : "border-transparent text-slate-500 hover:text-slate-800"
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

      {tab === "businesses" && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={createBusiness}
            className="h-fit space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold">Add a business</h2>
            <input
              aria-label="Business name"
              placeholder="Business name"
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              aria-label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <input
              aria-label="Location"
              placeholder="City or address"
              required
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              aria-label="Description"
              placeholder="Short description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
            <div className="rounded-md border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Opening hours (UTC)
              </p>
              {hours.map((hour, index) => (
                <div key={hour.day} className="mb-1 flex items-center gap-2 text-xs">
                  <label className="w-9 text-slate-600">{DAYS[hour.day]}</label>
                  <input
                    type="checkbox"
                    aria-label={`${DAYS[hour.day]} open`}
                    checked={!hour.closed}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((value, i) =>
                          i === index ? { ...value, closed: !event.target.checked } : value,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`${DAYS[hour.day]} from`}
                    type="time"
                    value={hour.open}
                    disabled={hour.closed}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((value, i) =>
                          i === index ? { ...value, open: event.target.value } : value,
                        ),
                      )
                    }
                    className="rounded border border-slate-300 px-1 py-0.5"
                  />
                  <input
                    aria-label={`${DAYS[hour.day]} to`}
                    type="time"
                    value={hour.close}
                    disabled={hour.closed}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((value, i) =>
                          i === index ? { ...value, close: event.target.value } : value,
                        ),
                      )
                    }
                    className="rounded border border-slate-300 px-1 py-0.5"
                  />
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Create business
            </button>
          </form>

          <div className="space-y-4">
            {items.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                You have no businesses yet. Create your first one.
              </p>
            )}
            {items.map((business) => (
              <div key={business.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">{business.name}</h2>
                    <p className="text-xs text-slate-500">
                      {business.category} · {business.location} · ★ {business.ratingAvg.toFixed(1)} (
                      {business.ratingCount})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteBusiness(business.id)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>

                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">Photos</h3>
                  {business.images.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {business.images.map((url) => (
                        <div
                          key={url}
                          className="relative h-16 w-20 overflow-hidden rounded bg-slate-100"
                        >
                          <Image
                            src={url}
                            alt={`${business.name} photo`}
                            fill
                            unoptimized
                            sizes="80px"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            aria-label={`Remove photo from ${business.name}`}
                            onClick={() => removePhoto(business.id, url)}
                            className="absolute right-0 top-0 rounded-bl bg-white/90 px-1.5 text-xs text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      aria-label={`Photo for ${business.name}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) =>
                        setPhotoFiles((current) => ({
                          ...current,
                          [business.id]: event.target.files?.[0] ?? null,
                        }))
                      }
                      className="text-xs"
                    />
                    <button
                      type="button"
                      disabled={busy || !photoFiles[business.id]}
                      onClick={() => uploadPhoto(business.id)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-60"
                    >
                      Upload photo
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Booking policies
                  </h3>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Minimum lead time (hours)
                      </label>
                      <input
                        aria-label={`Minimum lead time for ${business.name}`}
                        type="number"
                        min={0}
                        max={720}
                        value={policyLead[business.id] ?? String(business.minLeadTimeHours)}
                        onChange={(event) =>
                          setPolicyLead((current) => ({
                            ...current,
                            [business.id]: event.target.value,
                          }))
                        }
                        className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Cancellation cutoff (hours)
                      </label>
                      <input
                        aria-label={`Cancellation cutoff for ${business.name}`}
                        type="number"
                        min={0}
                        max={720}
                        value={
                          policyCutoff[business.id] ?? String(business.cancellationCutoffHours)
                        }
                        onChange={(event) =>
                          setPolicyCutoff((current) => ({
                            ...current,
                            [business.id]: event.target.value,
                          }))
                        }
                        className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => savePolicies(business)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-60"
                    >
                      Save policies
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">Services</h3>
                  {business.services.length === 0 && (
                    <p className="text-xs text-slate-500">No services yet.</p>
                  )}
                  <ul className="mb-3 space-y-1">
                    {business.services.map((service) => (
                      <li
                        key={service.id}
                        className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span>
                          {service.name} · {service.durationMin} min · ${service.price}
                          {(service.bufferBeforeMin > 0 || service.bufferAfterMin > 0) &&
                            ` · buffer ${service.bufferBeforeMin}/${service.bufferAfterMin} min`}
                          {!service.active && " (inactive)"}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteService(service.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <input
                      aria-label={`New service name for ${business.name}`}
                      placeholder="Service name"
                      value={serviceNames[business.id] ?? ""}
                      onChange={(event) =>
                        setServiceNames((current) => ({ ...current, [business.id]: event.target.value }))
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      aria-label="Duration in minutes"
                      type="number"
                      min={5}
                      max={480}
                      value={serviceDurations[business.id] ?? "30"}
                      onChange={(event) =>
                        setServiceDurations((current) => ({ ...current, [business.id]: event.target.value }))
                      }
                      className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      aria-label="Price"
                      type="number"
                      min={0}
                      value={servicePrices[business.id] ?? "0"}
                      onChange={(event) =>
                        setServicePrices((current) => ({ ...current, [business.id]: event.target.value }))
                      }
                      className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      aria-label="Buffer before in minutes"
                      type="number"
                      min={0}
                      max={60}
                      value={serviceBefore[business.id] ?? "0"}
                      onChange={(event) =>
                        setServiceBefore((current) => ({
                          ...current,
                          [business.id]: event.target.value,
                        }))
                      }
                      className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      aria-label="Buffer after in minutes"
                      type="number"
                      min={0}
                      max={60}
                      value={serviceAfter[business.id] ?? "0"}
                      onChange={(event) =>
                        setServiceAfter((current) => ({
                          ...current,
                          [business.id]: event.target.value,
                        }))
                      }
                      className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => addService(business.id)}
                      className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Add service
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "schedule" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
              <input
                aria-label="Schedule date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Business</label>
              <select
                aria-label="Schedule business"
                value={filterBusiness}
                onChange={(event) => setFilterBusiness(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All businesses</option>
                {items.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={loadSchedule}
              disabled={busy}
              className="rounded-full bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Load schedule
            </button>
          </div>
          <AppointmentList appointments={appointments} empty="No appointments match." />
        </div>
      )}

      {tab === "revenue" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Business</label>
              <select
                aria-label="Revenue business"
                value={filterBusiness}
                onChange={(event) => setFilterBusiness(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All businesses</option>
                {items.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={loadRevenue}
              disabled={busy}
              className="rounded-full bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Refresh revenue
            </button>
          </div>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-[#f5f3ff] p-4">
              <p className="text-xs text-slate-500">Completed revenue</p>
              <p className="text-2xl font-semibold text-[#6d28d9]">
                ${revenueData.totalRevenue}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Completed appointments</p>
              <p className="text-2xl font-semibold text-slate-800">
                {revenueData.completedCount}
              </p>
            </div>
          </div>
          {revenueData.byMonth.length === 0 ? (
            <p className="text-sm text-slate-500">No completed appointments yet.</p>
          ) : (
            <ul className="space-y-1">
              {revenueData.byMonth.map((row) => (
                <li key={row.month} className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span>{row.month}</span>
                  <span>
                    {row.count} bookings · ${row.revenue}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function AppointmentList({
  appointments,
  empty,
}: {
  appointments: AppointmentDTO[];
  empty: string;
}) {
  if (appointments.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {appointments.map((appointment) => (
        <li key={appointment.id} className="rounded-lg border border-slate-200 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-800">
              {appointment.serviceName} · {appointment.businessName}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
              {appointment.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(appointment.start).toLocaleString()} · {appointment.durationMin} min · $
            {appointment.price} · {appointment.customerName}
          </p>
        </li>
      ))}
    </ul>
  );
}
