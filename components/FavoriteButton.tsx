"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FavoriteButton({
  businessId,
  initialFavorite,
}: {
  businessId: string;
  initialFavorite: boolean;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        favorite ? `/api/favorites/${businessId}` : "/api/favorites",
        {
          method: favorite ? "DELETE" : "POST",
          headers: favorite ? undefined : { "Content-Type": "application/json" },
          body: favorite ? undefined : JSON.stringify({ businessId }),
        },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not update favorites");
      }
      setFavorite(!favorite);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update favorites");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
          favorite
            ? "border-[#7c3aed] bg-[#7c3aed] text-white"
            : "border-slate-300 bg-white text-slate-700"
        }`}
      >
        {favorite ? "★ Favorited" : "☆ Add to favorites"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
