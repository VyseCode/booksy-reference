import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IReview {
  _id: Types.ObjectId;
  appointment: Types.ObjectId;
  business: Types.ObjectId;
  author: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", maxlength: 1000 },
  },
  { timestamps: true },
);

reviewSchema.index({ business: 1, createdAt: -1 });
reviewSchema.index({ author: 1, createdAt: -1 });

export const Review: Model<IReview> =
  (models.Review as Model<IReview>) ||
  model<IReview>("Review", reviewSchema);
