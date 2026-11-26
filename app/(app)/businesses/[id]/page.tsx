import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getBusinessById, getReviews } from "@/lib/queries";
import { BookingPanel } from "@/components/BookingPanel";
import { FavoriteButton } from "@/components/FavoriteButton";

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
  const reviews = await getReviews(id, { page: 1, limit: 10 });

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
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-[#f5f3ff] px-3 py-1 text-sm font-semibold text-[#6d28d9]">
              ★ {business.ratingAvg.toFixed(1)} ({business.ratingCount})
            </span>
            <FavoriteButton businessId={business.id} initialFavorite={business.isFavorite} />
          </div>
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

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Reviews</h2>
        {reviews.items.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reviews.items.map((review) => (
              <li key={review.id} className="py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-amber-500">
                    {"★".repeat(review.rating)}
                    <span className="text-slate-300">{"★".repeat(5 - review.rating)}</span>
                  </span>
                  <span className="text-xs text-slate-500">{review.authorName}</span>
                </div>
                {review.comment && (
                  <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Book an appointment</h2>
        <BookingPanel businessId={business.id} services={business.services} />
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
