import { z } from "zod";
import { parseTime } from "@/lib/slots";
import { BUSINESS_CATEGORIES } from "@/models/Business";

const timePattern = /^\d{2}:\d{2}$/;

const openingHourSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    open: z.string().regex(timePattern, "Use HH:mm for opening time"),
    close: z.string().regex(timePattern, "Use HH:mm for closing time"),
    closed: z.boolean().default(false),
  })
  .refine(
    (hour) => {
      if (hour.closed) return true;
      const open = parseTime(hour.open);
      const close = parseTime(hour.close);
      return open !== null && close !== null && close > open;
    },
    { message: "Closing time must be after opening time", path: ["close"] },
  );

export const openingHoursSchema = z
  .array(openingHourSchema)
  .min(1, "Provide at least one opening hour")
  .refine(
    (hours) => new Set(hours.map((hour) => hour.day)).size === hours.length,
    { message: "Each day of the week may appear only once" },
  );

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(BUSINESS_CATEGORIES),
  description: z.string().trim().max(2000).default(""),
  location: z.string().trim().min(1).max(120),
  images: z.array(z.string().trim().min(1)).max(10).default([]),
  openingHours: openingHoursSchema,
  minLeadTimeHours: z.number().min(0).max(720).optional(),
  cancellationCutoffHours: z.number().min(0).max(720).optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  category: z.enum(BUSINESS_CATEGORIES).optional(),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().min(1).max(120).optional(),
  images: z.array(z.string().trim().min(1)).max(10).optional(),
  openingHours: openingHoursSchema.optional(),
  minLeadTimeHours: z.number().min(0).max(720).optional(),
  cancellationCutoffHours: z.number().min(0).max(720).optional(),
});

export const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(""),
  durationMin: z.number().int().min(5).max(480),
  price: z.number().min(0).max(100000),
  bufferBeforeMin: z.number().int().min(0).max(60).optional(),
  bufferAfterMin: z.number().int().min(0).max(60).optional(),
  active: z.boolean().default(true),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  durationMin: z.number().int().min(5).max(480).optional(),
  price: z.number().min(0).max(100000).optional(),
  bufferBeforeMin: z.number().int().min(0).max(60).optional(),
  bufferAfterMin: z.number().int().min(0).max(60).optional(),
  active: z.boolean().optional(),
});

export const bookAppointmentSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  start: z.string().datetime("Provide a valid ISO start time"),
});

export const appointmentActionSchema = z.object({
  action: z.enum(["confirm", "cancel", "complete"]),
  reason: z.string().trim().max(300).optional(),
});

export const createReviewSchema = z.object({
  appointmentId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(""),
});
