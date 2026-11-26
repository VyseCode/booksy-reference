import Link from "next/link";
import type { BusinessDTO } from "@/lib/types";

export function BusinessCard({ business }: { business: BusinessDTO }) {
  return (
    <Link
      href={`/businesses/${business.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#7c3aed]/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-800">{business.name}</h2>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[#7c3aed]">
            {business.category}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#f5f3ff] px-2.5 py-1 text-xs font-semibold text-[#6d28d9]">
          ★ {business.ratingAvg.toFixed(1)}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-500">{business.location}</p>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
        {business.description || "Local service business"}
      </p>
      <p className="mt-3 text-xs text-slate-400">{business.ratingCount} reviews</p>
    </Link>
  );
}
