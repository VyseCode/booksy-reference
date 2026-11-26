import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getBusinesses } from "@/lib/queries";
import { BrowseView, type BrowseParams } from "@/components/BrowseView";

export const metadata = { title: "Explore businesses" };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const query = await searchParams;
  const session = await getSession();
  await connectDB();

  const params: BrowseParams = {
    q: first(query.q),
    category: first(query.category),
    location: first(query.location),
    sort: first(query.sort) === "newest" ? "newest" : "rating",
    favoritesOnly: first(query.favoritesOnly) === "true",
    page: Math.max(1, Number(first(query.page)) || 1),
  };

  const result = await getBusinesses({
    viewerId: session?.userId ?? "",
    ...params,
    limit: 9,
  });

  return <BrowseView initial={result} params={params} />;
}
