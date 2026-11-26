import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getBusinessById } from "@/lib/queries";

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  await connectDB();
  const business = await getBusinessById(id, session?.userId ?? "");
  if (!business) notFound();

  return (
    <section className="space-y-5">
      <Link href="/browse" className="text-sm text-[#7c3aed] hover:underline">
        ← Back to explore
      </Link>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{business.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {business.category} · {business.location}
            </p>
          </div>
          <span className="rounded-full bg-[#f5f3ff] px-3 py-1 text-sm font-semibold text-[#6d28d9]">
            ★ {business.ratingAvg.toFixed(1)} ({business.ratingCount})
          </span>
        </div>
        {business.description && (
          <p className="mt-4 text-sm leading-relaxed text-slate-600">{business.description}</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Services</h2>
        {business.services.length === 0 ? (
          <p className="text-sm text-slate-500">No services are available yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {business.services.map((service) => (
              <li key={service.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-800">{service.name}</p>
                  <p className="text-xs text-slate-500">
                    {service.durationMin} min{service.description ? ` · ${service.description}` : ""}
                  </p>
                </div>
                <span className="font-semibold text-slate-800">${service.price}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {business.isOwner && (
        <Link
          href="/owner"
          className="inline-block rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
        >
          Manage this business
        </Link>
      )}
    </section>
  );
}
