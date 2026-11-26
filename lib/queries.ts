import { Types } from "mongoose";
import { Business } from "@/models/Business";
import { Service } from "@/models/Service";
import { Favorite } from "@/models/Favorite";
import { Appointment } from "@/models/Appointment";
import { Review } from "@/models/Review";
import { availableSlots, candidateSlots } from "@/lib/slots";
import { meetsLeadTime } from "@/lib/policies";
import type {
  AppointmentDTO,
  BusinessDTO,
  BusinessDetailDTO,
  BusinessWithServices,
  OpeningHourDTO,
  Paginated,
  ReviewDTO,
  ServiceDTO,
  SlotDTO,
} from "@/lib/types";

type LeanBusiness = {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  category: string;
  description: string;
  location: string;
  images: string[];
  openingHours: Array<{
    day: number;
    open: string;
    close: string;
    closed: boolean;
  }>;
  minLeadTimeHours?: number;
  cancellationCutoffHours?: number;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
};

type LeanService = {
  _id: Types.ObjectId;
  business: Types.ObjectId;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
  active: boolean;
};

type LeanAppointment = {
  _id: Types.ObjectId;
  business: { _id: Types.ObjectId; name: string } | null;
  service: { _id: Types.ObjectId; name: string } | null;
  customer: { _id: Types.ObjectId; name: string } | null;
  start: Date;
  end: Date;
  durationMin: number;
  price: number;
  status: string;
  cancelReason: string;
  createdAt: Date;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function favoriteIdsFor(viewerId: string): Promise<Set<string>> {
  if (!viewerId || !Types.ObjectId.isValid(viewerId)) return new Set();
  const docs = await Favorite.find({ user: viewerId }).select("business").lean();
  return new Set(docs.map((doc) => doc.business.toString()));
}

function toBusinessDTO(
  doc: LeanBusiness,
  viewerId: string,
  favorites: Set<string>,
): BusinessDTO {
  return {
    id: doc._id.toString(),
    ownerId: doc.owner.toString(),
    name: doc.name,
    category: doc.category,
    description: doc.description ?? "",
    location: doc.location,
    images: doc.images ?? [],
    openingHours: (doc.openingHours ?? []).map<OpeningHourDTO>((hour) => ({
      day: hour.day,
      open: hour.open,
      close: hour.close,
      closed: hour.closed,
    })),
    minLeadTimeHours: doc.minLeadTimeHours ?? 2,
    cancellationCutoffHours: doc.cancellationCutoffHours ?? 4,
    ratingAvg: doc.ratingAvg ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    isOwner: doc.owner.toString() === viewerId,
    isFavorite: favorites.has(doc._id.toString()),
    createdAt: doc.createdAt.toISOString(),
  };
}

function toServiceDTO(doc: LeanService): ServiceDTO {
  return {
    id: doc._id.toString(),
    businessId: doc.business.toString(),
    name: doc.name,
    description: doc.description ?? "",
    durationMin: doc.durationMin,
    price: doc.price,
    bufferBeforeMin: doc.bufferBeforeMin ?? 0,
    bufferAfterMin: doc.bufferAfterMin ?? 0,
    active: doc.active,
  };
}

export async function getBusinesses(options: {
  viewerId: string;
  q?: string;
  category?: string;
  location?: string;
  sort?: "rating" | "newest";
  favoritesOnly?: boolean;
  page: number;
  limit: number;
}): Promise<Paginated<BusinessDTO>> {
  const filter: Record<string, unknown> = {};
  const term = options.q?.trim();
  if (term) {
    const regex = new RegExp(escapeRegex(term), "i");
    filter.$or = [{ name: regex }, { description: regex }, { location: regex }];
  }
  if (options.category) filter.category = options.category;
  if (options.location?.trim()) {
    filter.location = new RegExp(escapeRegex(options.location.trim()), "i");
  }
  if (options.favoritesOnly) {
    const ids = await favoriteIdsFor(options.viewerId);
    filter._id = { $in: [...ids].map((id) => new Types.ObjectId(id)) };
  }

  const limit = Math.min(Math.max(options.limit, 1), 50);
  const page = Math.max(options.page, 1);
  const sort: Record<string, 1 | -1> =
    options.sort === "newest"
      ? { createdAt: -1 }
      : { ratingAvg: -1, createdAt: -1 };

  const [docs, total, favorites] = await Promise.all([
    Business.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean() as unknown as Promise<LeanBusiness[]>,
    Business.countDocuments(filter),
    favoriteIdsFor(options.viewerId),
  ]);

  return {
    items: docs.map((doc) => toBusinessDTO(doc, options.viewerId, favorites)),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

export async function getBusinessById(
  id: string,
  viewerId: string,
): Promise<BusinessDetailDTO | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  const [doc, services, favorites] = await Promise.all([
    Business.findById(id).lean() as unknown as Promise<LeanBusiness | null>,
    Service.find({ business: id, active: true })
      .sort({ createdAt: 1 })
      .lean() as unknown as Promise<LeanService[]>,
    favoriteIdsFor(viewerId),
  ]);
  if (!doc) return null;
  return {
    ...toBusinessDTO(doc, viewerId, favorites),
    services: services.map(toServiceDTO),
  };
}

export async function getOwnerBusinesses(
  ownerId: string,
): Promise<BusinessWithServices[]> {
  const docs = (await Business.find({ owner: ownerId })
    .sort({ createdAt: -1 })
    .lean()) as unknown as LeanBusiness[];
  const favorites = await favoriteIdsFor(ownerId);
  const allServices = (await Service.find({ business: { $in: docs.map((doc) => doc._id) } })
    .sort({ createdAt: 1 })
    .lean()) as unknown as LeanService[];
  return docs.map((doc) => ({
    ...toBusinessDTO(doc, ownerId, favorites),
    services: allServices
      .filter((service) => service.business.toString() === doc._id.toString())
      .map(toServiceDTO),
  }));
}

export async function getInitialBookingSlots(
  businessId: string,
): Promise<{ date: string; slots: SlotDTO[] }> {
  if (!Types.ObjectId.isValid(businessId)) return { date: "", slots: [] };
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [business, services] = await Promise.all([
    Business.findById(businessId).select("openingHours minLeadTimeHours").lean() as unknown as Promise<{
      openingHours: Array<{
        day: number;
        open: string;
        close: string;
        closed: boolean;
      }>;
      minLeadTimeHours?: number;
    } | null>,
    Service.find({ business: businessId, active: true })
      .sort({ createdAt: 1 })
      .limit(1)
      .lean() as unknown as Promise<LeanService[]>,
  ]);
  const first = services[0];
  if (!business || !first) return { date, slots: [] };
  const candidates = candidateSlots(
    business.openingHours,
    date,
    first.durationMin,
    new Date(),
    { beforeMin: first.bufferBeforeMin, afterMin: first.bufferAfterMin },
  ).filter((slot) => meetsLeadTime(slot.start, business.minLeadTimeHours ?? 2));
  const booked = await getBookedSlotKeys(businessId, date);
  return {
    date,
    slots: availableSlots(candidates, booked).map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
    })),
  };
}

export async function getServices(businessId: string): Promise<ServiceDTO[]> {
  if (!Types.ObjectId.isValid(businessId)) return [];
  const docs = (await Service.find({ business: businessId })
    .sort({ createdAt: 1 })
    .lean()) as unknown as LeanService[];
  return docs.map(toServiceDTO);
}

export async function getBookedSlotKeys(
  businessId: string,
  dateKeyString: string,
): Promise<Set<string>> {
  const dayStart = new Date(`${dateKeyString}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const docs = (await Appointment.find({
    business: businessId,
    status: { $ne: "cancelled" },
    start: { $gte: dayStart, $lt: dayEnd },
  })
    .select("slotKeys")
    .lean()) as unknown as Array<{ slotKeys: string[] }>;
  return new Set(docs.flatMap((doc) => doc.slotKeys ?? []));
}

export async function applyReviewDelta(
  businessId: string,
  ratingDelta: number,
  countDelta: number,
): Promise<void> {
  const guard: Record<string, unknown> = {};
  if (countDelta < 0) guard.ratingCount = { $gte: -countDelta };
  if (ratingDelta < 0) guard.ratingSum = { $gte: -ratingDelta };

  const updated = await Business.findOneAndUpdate(
    { _id: businessId, ...guard },
    { $inc: { ratingSum: ratingDelta, ratingCount: countDelta } },
    { new: true },
  )
    .select("ratingSum ratingCount")
    .lean();
  if (!updated) return;

  const average =
    updated.ratingCount > 0
      ? Math.round((updated.ratingSum / updated.ratingCount) * 100) / 100
      : 0;
  await Business.updateOne({ _id: businessId }, { $set: { ratingAvg: average } });
}

function toAppointmentDTO(
  doc: LeanAppointment,
  reviewedIds: Set<string>,
): AppointmentDTO {
  return {
    id: doc._id.toString(),
    businessId: doc.business?._id.toString() ?? "",
    businessName: doc.business?.name ?? "Business",
    serviceId: doc.service?._id.toString() ?? "",
    serviceName: doc.service?.name ?? "Service",
    customerId: doc.customer?._id.toString() ?? "",
    customerName: doc.customer?.name ?? "Customer",
    start: doc.start.toISOString(),
    end: doc.end.toISOString(),
    durationMin: doc.durationMin,
    price: doc.price,
    status: doc.status,
    cancelReason: doc.cancelReason ?? "",
    hasReview: reviewedIds.has(doc._id.toString()),
    createdAt: doc.createdAt.toISOString(),
  };
}

async function reviewedIdsFor(ids: Types.ObjectId[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const docs = await Review.find({ appointment: { $in: ids } })
    .select("appointment")
    .lean();
  return new Set(docs.map((doc) => doc.appointment.toString()));
}

export async function getCustomerAppointments(
  customerId: string,
  options: { status?: string; page: number; limit: number },
): Promise<Paginated<AppointmentDTO>> {
  const filter: Record<string, unknown> = { customer: customerId };
  if (options.status) filter.status = options.status;
  const limit = Math.min(Math.max(options.limit, 1), 50);
  const page = Math.max(options.page, 1);

  const [docs, total] = await Promise.all([
    Appointment.find(filter)
      .sort({ start: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("business", "name")
      .populate("service", "name")
      .populate("customer", "name")
      .lean() as unknown as Promise<LeanAppointment[]>,
    Appointment.countDocuments(filter),
  ]);
  const reviewed = await reviewedIdsFor(docs.map((doc) => doc._id));
  return {
    items: docs.map((doc) => toAppointmentDTO(doc, reviewed)),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

export async function getAppointmentById(id: string): Promise<AppointmentDTO | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = (await Appointment.findById(id)
    .populate("business", "name")
    .populate("service", "name")
    .populate("customer", "name")
    .lean()) as unknown as LeanAppointment | null;
  if (!doc) return null;
  return toAppointmentDTO(doc, await reviewedIdsFor([doc._id]));
}

export async function getOwnerAppointments(
  ownerId: string,
  options: { date?: string; businessId?: string; status?: string },
): Promise<AppointmentDTO[]> {
  const businesses = (await Business.find({ owner: ownerId })
    .select("_id")
    .lean()) as unknown as Array<{ _id: Types.ObjectId }>;
  let businessIds = businesses.map((doc) => doc._id);
  if (options.businessId && Types.ObjectId.isValid(options.businessId)) {
    businessIds = businessIds.filter(
      (id) => id.toString() === options.businessId,
    );
  }
  if (!businessIds.length) return [];

  const filter: Record<string, unknown> = { business: { $in: businessIds } };
  if (options.date) {
    const start = new Date(`${options.date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    filter.start = { $gte: start, $lt: end };
  }
  if (options.status) filter.status = options.status;

  const docs = (await Appointment.find(filter)
    .sort({ start: 1 })
    .limit(200)
    .populate("business", "name")
    .populate("service", "name")
    .populate("customer", "name")
    .lean()) as unknown as LeanAppointment[];
  const reviewed = await reviewedIdsFor(docs.map((doc) => doc._id));
  return docs.map((doc) => toAppointmentDTO(doc, reviewed));
}

export async function getOwnerRevenue(
  ownerId: string,
  businessId?: string,
): Promise<{ totalRevenue: number; completedCount: number; byMonth: Array<{ month: string; revenue: number; count: number }> }> {
  const businesses = (await Business.find({ owner: ownerId })
    .select("_id")
    .lean()) as unknown as Array<{ _id: Types.ObjectId }>;
  let businessIds = businesses.map((doc) => doc._id);
  if (businessId && Types.ObjectId.isValid(businessId)) {
    businessIds = businessIds.filter((id) => id.toString() === businessId);
  }
  if (!businessIds.length) {
    return { totalRevenue: 0, completedCount: 0, byMonth: [] };
  }

  const rows = (await Appointment.aggregate([
    { $match: { business: { $in: businessIds }, status: "completed" } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$start" } },
        revenue: { $sum: "$price" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ])) as unknown as Array<{ _id: string; revenue: number; count: number }>;

  return {
    totalRevenue: rows.reduce((sum, row) => sum + row.revenue, 0),
    completedCount: rows.reduce((sum, row) => sum + row.count, 0),
    byMonth: rows.map((row) => ({
      month: row._id,
      revenue: row.revenue,
      count: row.count,
    })),
  };
}

export async function getReviews(
  businessId: string,
  options: { page: number; limit: number },
): Promise<Paginated<ReviewDTO>> {
  const limit = Math.min(Math.max(options.limit, 1), 50);
  const page = Math.max(options.page, 1);
  const filter = { business: businessId };
  const [docs, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "name")
      .lean() as unknown as Promise<
      Array<{
        _id: Types.ObjectId;
        appointment: Types.ObjectId;
        business: Types.ObjectId;
        author: { _id: Types.ObjectId; name: string } | null;
        rating: number;
        comment: string;
        createdAt: Date;
      }>
    >,
    Review.countDocuments(filter),
  ]);
  return {
    items: docs.map((doc) => ({
      id: doc._id.toString(),
      appointmentId: doc.appointment.toString(),
      businessId: doc.business.toString(),
      authorId: doc.author?._id.toString() ?? "",
      authorName: doc.author?.name ?? "Customer",
      rating: doc.rating,
      comment: doc.comment ?? "",
      createdAt: doc.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}
