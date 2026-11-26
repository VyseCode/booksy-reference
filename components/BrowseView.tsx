"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BusinessCard } from "@/components/BusinessCard";
import type { BusinessDTO, Paginated } from "@/lib/types";

export type BrowseParams = {
  q: string;
  category: string;
  location: string;
  sort: "rating" | "newest";
  favoritesOnly: boolean;
  page: number;
};

const CATEGORIES = ["", "salon", "barbershop", "clinic", "spa", "fitness", "other"];

export function BrowseView({
  initial,
  params,
}: {
  initial: Paginated<BusinessDTO>;
  params: BrowseParams;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(params.q);
  const [location, setLocation] = useState(params.location);

  function navigate(changes: Partial<BrowseParams>, page = 1) {
    const next = { ...params, ...changes, page };
    const search = new URLSearchParams();
    if (next.q) search.set("q", next.q);
    if (next.category) search.set("category", next.category);
    if (next.location) search.set("location", next.location);
    if (next.sort !== "rating") search.set("sort", next.sort);
    if (next.favoritesOnly) search.set("favoritesOnly", "true");
    if (page > 1) search.set("page", String(page));
    router.push(`/browse${search.toString() ? `?${search.toString()}` : ""}`);
  }

  const totalPages = Math.max(1, Math.ceil(initial.total / initial.limit));

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Explore businesses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Find local services and book a time that works for you.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ q: query.trim(), location: location.trim() });
        }}
        className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]"
      >
        <input
          aria-label="Search businesses"
          placeholder="Search by name or service"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          aria-label="Filter by location"
          placeholder="City or address"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-[#7c3aed] px-5 py-2 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by category"
          value={params.category}
          onChange={(event) => navigate({ category: event.target.value })}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value ? value[0].toUpperCase() + value.slice(1) : "All categories"}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort results"
          value={params.sort}
          onChange={(event) =>
            navigate({ sort: event.target.value as "rating" | "newest" })
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="rating">Highest rated</option>
          <option value="newest">Newest</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={params.favoritesOnly}
            onChange={(event) => navigate({ favoritesOnly: event.target.checked })}
          />
          Favorites only
        </label>
        <span className="ml-auto text-sm text-slate-500">{initial.total} results</span>
      </div>

      {initial.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">No businesses found</p>
          <p className="mt-1 text-sm text-slate-500">Try changing your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initial.items.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={initial.page <= 1}
            onClick={() => navigate({}, initial.page - 1)}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {initial.page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={!initial.hasMore}
            onClick={() => navigate({}, initial.page + 1)}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
