import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getCustomerAppointments } from "@/lib/queries";
import { MyAppointments } from "@/components/MyAppointments";

export const metadata = { title: "My bookings" };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function AppointmentsPage({
  searchParams,
}: PageProps<"/appointments">) {
  const session = await getSession();
  if (!session) redirect("/login");
  await connectDB();

  const params = await searchParams;
  const status = first(params.status);
  const page = Math.max(1, Number(first(params.page)) || 1);
  const result = await getCustomerAppointments(session.userId, {
    status: ["pending", "confirmed", "completed", "cancelled"].includes(status)
      ? status
      : undefined,
    page,
    limit: 20,
  });

  return <MyAppointments initial={result} status={status || "all"} />;
}
