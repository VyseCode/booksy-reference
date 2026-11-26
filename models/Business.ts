import { Schema, model, models, type Model, type Types } from "mongoose";

export type BusinessCategory =
  | "salon"
  | "barbershop"
  | "clinic"
  | "spa"
  | "fitness"
  | "other";

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  "salon",
  "barbershop",
  "clinic",
  "spa",
  "fitness",
  "other",
];

export interface IOpeningHour {
  _id: Types.ObjectId;
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

export interface IBusiness {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  category: BusinessCategory;
  description: string;
  location: string;
  images: string[];
  openingHours: IOpeningHour[];
  minLeadTimeHours: number;
  cancellationCutoffHours: number;
  ratingSum: number;
  ratingCount: number;
  ratingAvg: number;
  createdAt: Date;
  updatedAt: Date;
}

const openingHourSchema = new Schema<IOpeningHour>(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    open: { type: String, default: "09:00" },
    close: { type: String, default: "18:00" },
    closed: { type: Boolean, default: false },
  },
  { _id: true },
);

const businessSchema = new Schema<IBusiness>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: {
      type: String,
      required: true,
      enum: BUSINESS_CATEGORIES,
      index: true,
    },
    description: { type: String, default: "", maxlength: 2000 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    images: { type: [String], default: [] },
    openingHours: { type: [openingHourSchema], default: [] },
    minLeadTimeHours: { type: Number, default: 2, min: 0, max: 720 },
    cancellationCutoffHours: { type: Number, default: 4, min: 0, max: 720 },
    ratingSum: { type: Number, default: 0, min: 0 },
    ratingCount: { type: Number, default: 0, min: 0 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true },
);

businessSchema.index({ owner: 1, name: 1 }, { unique: true });
businessSchema.index({ category: 1, createdAt: -1 });
businessSchema.index({ location: 1, createdAt: -1 });
businessSchema.index({ ratingAvg: -1, createdAt: -1 });
businessSchema.index({ name: "text", description: "text", location: "text" });

export const Business: Model<IBusiness> =
  (models.Business as Model<IBusiness>) ||
  model<IBusiness>("Business", businessSchema);
