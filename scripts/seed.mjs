import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/booksy_ref";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    avatarUrl: String,
    phone: String,
  },
  { timestamps: true },
);

const businessSchema = new mongoose.Schema(
  {
    owner: mongoose.Schema.Types.ObjectId,
    name: String,
    category: String,
    description: String,
    location: String,
    images: [String],
    openingHours: [{ day: Number, open: String, close: String, closed: Boolean }],
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
  },
  { timestamps: true },
);
businessSchema.index({ owner: 1, name: 1 }, { unique: true });
businessSchema.index({ category: 1, createdAt: -1 });
businessSchema.index({ location: 1, createdAt: -1 });
businessSchema.index({ ratingAvg: -1, createdAt: -1 });

const serviceSchema = new mongoose.Schema(
  {
    business: mongoose.Schema.Types.ObjectId,
    name: String,
    description: String,
    durationMin: Number,
    price: Number,
    active: Boolean,
  },
  { timestamps: true },
);
serviceSchema.index({ business: 1, name: 1 }, { unique: true });

const appointmentSchema = new mongoose.Schema(
  {
    business: mongoose.Schema.Types.ObjectId,
    service: mongoose.Schema.Types.ObjectId,
    customer: mongoose.Schema.Types.ObjectId,
    start: Date,
    end: Date,
    durationMin: Number,
    price: Number,
    status: String,
    slotKeys: [String],
    cancelReason: String,
  },
  { timestamps: true },
);
appointmentSchema.index({ business: 1, slotKeys: 1 }, { unique: true });
appointmentSchema.index({ customer: 1, start: -1 });
appointmentSchema.index({ business: 1, start: 1 });

const reviewSchema = new mongoose.Schema(
  {
    appointment: mongoose.Schema.Types.ObjectId,
    business: mongoose.Schema.Types.ObjectId,
    author: mongoose.Schema.Types.ObjectId,
    rating: Number,
    comment: String,
  },
  { timestamps: true },
);
reviewSchema.index({ appointment: 1 }, { unique: true });
reviewSchema.index({ business: 1, createdAt: -1 });

const favoriteSchema = new mongoose.Schema(
  { user: mongoose.Schema.Types.ObjectId, business: mongoose.Schema.Types.ObjectId },
  { timestamps: { createdAt: true, updatedAt: false } },
);
favoriteSchema.index({ user: 1, business: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
const Business = mongoose.model("Business", businessSchema);
const Service = mongoose.model("Service", serviceSchema);
const Appointment = mongoose.model("Appointment", appointmentSchema);
const Review = mongoose.model("Review", reviewSchema);
const Favorite = mongoose.model("Favorite", favoriteSchema);

const MODELS = [User, Business, Service, Appointment, Review, Favorite];

async function main() {
  if (!URI.includes("booksy_ref")) {
    throw new Error("Refusing to seed a database other than booksy_ref");
  }
  await mongoose.connect(URI);
  await Promise.all(MODELS.map((model) => model.createIndexes()));
  await Promise.all(MODELS.map((model) => model.deleteMany({})));

  const password = await bcrypt.hash("password123", 12);
  const owner = await User.create({
    name: "Seed Owner",
    email: "owner@example.com",
    password,
  });
  const customer = await User.create({
    name: "Seed Customer",
    email: "customer@example.com",
    password,
  });
  const business = await Business.create({
    owner: owner._id,
    name: "Seed Studio",
    category: "salon",
    description: "Seed skeleton business",
    location: "Test City",
    images: [],
    openingHours: [{ day: 1, open: "09:00", close: "18:00", closed: false }],
  });
  const service = await Service.create({
    business: business._id,
    name: "Seed Service",
    description: "Seed skeleton service",
    durationMin: 30,
    price: 25,
    active: true,
  });
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  start.setUTCMinutes(0, 0, 0);
  const appointment = await Appointment.create({
    business: business._id,
    service: service._id,
    customer: customer._id,
    start,
    end: new Date(start.getTime() + service.durationMin * 60000),
    durationMin: service.durationMin,
    price: service.price,
    status: "pending",
    slotKeys: [start.toISOString()],
  });
  await Review.create({
    appointment: appointment._id,
    business: business._id,
    author: customer._id,
    rating: 5,
    comment: "Skeleton review",
  });
  await Favorite.create({ user: customer._id, business: business._id });

  console.log("Seed skeleton: created one document per model in booksy_ref.");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
