import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IService {
  _id: Types.ObjectId;
  business: Types.ObjectId;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 500 },
    durationMin: { type: Number, required: true, min: 5, max: 480 },
    price: { type: Number, required: true, min: 0, max: 100000 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

serviceSchema.index({ business: 1, name: 1 }, { unique: true });
serviceSchema.index({ business: 1, active: 1, createdAt: -1 });

export const Service: Model<IService> =
  (models.Service as Model<IService>) ||
  model<IService>("Service", serviceSchema);
