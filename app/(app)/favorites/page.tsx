import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getBusinesses } from "@/lib/queries";
import { FavoriteGrid } from "@/components/FavoriteGrid";

export const metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await connectDB();
  const favorites = await getBusinesses({
    viewerId: session.userId,
    favoritesOnly: true,
    page: 1,
    limit: 50,
  });

  return (
    <section>
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Favorites</h1>
      <p className="mb-5 text-sm text-slate-500">Your saved businesses.</p>
      <FavoriteGrid initial={favorites} />
    </section>
  );
}
