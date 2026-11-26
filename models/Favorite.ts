import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IFavorite {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  business: Types.ObjectId;
  createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

favoriteSchema.index({ user: 1, business: 1 }, { unique: true });
favoriteSchema.index({ user: 1, createdAt: -1 });

export const Favorite: Model<IFavorite> =
  (models.Favorite as Model<IFavorite>) ||
  model<IFavorite>("Favorite", favoriteSchema);
