import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getOwnerAppointments, getOwnerBusinesses, getOwnerRevenue } from "@/lib/queries";
import { OwnerDashboard } from "@/components/OwnerDashboard";

export const metadata = { title: "Owner workspace" };

export default async function OwnerPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await connectDB();

  const [businesses, schedule, revenue] = await Promise.all([
    getOwnerBusinesses(session.userId),
    getOwnerAppointments(session.userId, {}),
    getOwnerRevenue(session.userId),
  ]);

  return <OwnerDashboard businesses={businesses} schedule={schedule} revenue={revenue} />;
}
