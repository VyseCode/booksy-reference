"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BusinessCard } from "@/components/BusinessCard";
import type { BusinessDTO, Paginated } from "@/lib/types";

export function FavoriteGrid({ initial }: { initial: Paginated<BusinessDTO> }) {
  const router = useRouter();
  const [items, setItems] = useState(initial.items);
  const [error, setError] = useState("");

  async function remove(business: BusinessDTO) {
    setError("");
    try {
      const response = await fetch(`/api/favorites/${business.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not remove favorite");
      }
      setItems((current) => current.filter((item) => item.id !== business.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove favorite");
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">No favorites yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Tap “Add to favorites” on a business to save it here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((business) => (
            <div key={business.id}>
              <BusinessCard business={business} />
              <button
                type="button"
                onClick={() => remove(business)}
                className="mt-2 text-xs font-medium text-red-600 hover:underline"
              >
                Remove from favorites
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
