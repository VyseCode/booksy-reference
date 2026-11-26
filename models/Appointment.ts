import { Schema, model, models, type Model, type Types } from "mongoose";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

export interface IAppointment {
  _id: Types.ObjectId;
  business: Types.ObjectId;
  service: Types.ObjectId;
  customer: Types.ObjectId;
  start: Date;
  end: Date;
  durationMin: number;
  price: number;
  status: AppointmentStatus;
  slotKeys: string[];
  cancelReason: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    durationMin: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: APPOINTMENT_STATUSES,
      default: "pending",
      index: true,
    },
    slotKeys: { type: [String], default: [] },
    cancelReason: { type: String, default: "" },
  },
  { timestamps: true },
);

appointmentSchema.index(
  { business: 1, slotKeys: 1 },
  {
    unique: true,
    partialFilterExpression: { "slotKeys.0": { $exists: true } },
  },
);
appointmentSchema.index({ customer: 1, start: -1 });
appointmentSchema.index({ business: 1, start: 1 });
appointmentSchema.index({ status: 1, start: 1 });

export const Appointment: Model<IAppointment> =
  (models.Appointment as Model<IAppointment>) ||
  model<IAppointment>("Appointment", appointmentSchema);
