import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IUpload {
  _id: Types.ObjectId;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
}

const uploadSchema = new Schema<IUpload>(
  {
    contentType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    data: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Upload: Model<IUpload> =
  (models.Upload as Model<IUpload>) || model<IUpload>("Upload", uploadSchema);
