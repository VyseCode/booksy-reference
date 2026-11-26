import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/booksy_ref";
const SLOT_MS = 15 * 60 * 1000;

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
    minLeadTimeHours: { type: Number, default: 2 },
    cancellationCutoffHours: { type: Number, default: 4 },
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
    bufferBeforeMin: { type: Number, default: 0 },
    bufferAfterMin: { type: Number, default: 0 },
    active: Boolean,
  },
  { timestamps: true },
);
serviceSchema.index({ business: 1, name: 1 }, { unique: true });
serviceSchema.index({ business: 1, active: 1, createdAt: -1 });

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
appointmentSchema.index(
  { business: 1, slotKeys: 1 },
  { unique: true, partialFilterExpression: { "slotKeys.0": { $exists: true } } },
);
appointmentSchema.index({ customer: 1, start: -1 });
appointmentSchema.index({ business: 1, start: 1 });
appointmentSchema.index({ status: 1, start: 1 });

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

const uploadSchema = new mongoose.Schema(
  {
    contentType: String,
    size: Number,
    data: Buffer,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const User = mongoose.model("User", userSchema);
const Business = mongoose.model("Business", businessSchema);
const Service = mongoose.model("Service", serviceSchema);
const Appointment = mongoose.model("Appointment", appointmentSchema);
const Review = mongoose.model("Review", reviewSchema);
const Favorite = mongoose.model("Favorite", favoriteSchema);
const Upload = mongoose.model("Upload", uploadSchema);
const MODELS = [User, Business, Service, Appointment, Review, Favorite, Upload];

function minutes(time) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function dateKey(offsetDays) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function slotKeysFor(start, durationMin, beforeMin = 0, afterMin = 0) {
  const before = Math.ceil(Math.max(0, beforeMin) / 15) * 15;
  const after = Math.ceil(Math.max(0, afterMin) / 15) * 15;
  const keys = [];
  const from = start.getTime() - before * 60 * 1000;
  const until = from + (durationMin + before + after) * 60 * 1000;
  for (let time = from; time < until; time += SLOT_MS) {
    keys.push(new Date(time).toISOString());
  }
  return keys;
}

function pickSlot(business, offsetDays, durationMin) {
  let delta = offsetDays;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const key = dateKey(delta);
    const day = new Date(`${key}T00:00:00.000Z`).getUTCDay();
    const hour = business.openingHours.find((value) => value.day === day);
    if (hour && !hour.closed) {
      const startMinute = minutes(hour.open) + 15;
      if (startMinute + durationMin <= minutes(hour.close)) {
        const base = new Date(`${key}T00:00:00.000Z`).getTime();
        return new Date(base + startMinute * 60 * 1000);
      }
    }
    delta += offsetDays >= 0 ? 1 : -1;
  }
  throw new Error("Could not find an open slot for the seeded appointment");
}

const hours = (open, close, closedDays = []) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open,
    close,
    closed: closedDays.includes(day),
  }));

async function main() {
  if (!URI.includes("booksy_ref")) {
    throw new Error("Refusing to seed a database other than booksy_ref");
  }
  await mongoose.connect(URI);
  await Appointment.collection.dropIndex("business_1_slotKeys_1").catch(() => {});
  await Promise.all(MODELS.map((model) => model.createIndexes()));
  await Promise.all(MODELS.map((model) => model.deleteMany({})));

  const password = await bcrypt.hash("password123", 12);
  const users = await User.create(
    [
      ["Ava Morgan", "owner@example.com"],
      ["Cody Customer", "customer@example.com"],
      ["Mia Chen", "mia@example.com"],
      ["Liam Patel", "liam@example.com"],
      ["Noah Kim", "noah@example.com"],
      ["Zoe Diaz", "zoe@example.com"],
    ].map(([name, email]) => ({ name, email, password, phone: "+1 555 0100" })),
  );
  const [ava, cody, mia, liam, noah, zoe] = users;

  const businesses = await Business.create([
    {
      owner: ava._id,
      name: "Glow Hair Studio",
      category: "salon",
      description: "Modern hair salon offering cuts, color and styling.",
      location: "Austin, TX",
      images: [],
      openingHours: hours("09:00", "19:00", [0]),
      minLeadTimeHours: 2,
      cancellationCutoffHours: 4,
    },
    {
      owner: ava._id,
      name: "Sharp Edge Barbers",
      category: "barbershop",
      description: "Classic and contemporary barbering for every style.",
      location: "Austin, TX",
      images: [],
      openingHours: hours("10:00", "20:00", [0, 1]),
      minLeadTimeHours: 4,
      cancellationCutoffHours: 12,
    },
    {
      owner: mia._id,
      name: "Wellness Clinic",
      category: "clinic",
      description: "Patient-first clinic for consultations and therapy.",
      location: "Denver, CO",
      images: [],
      openingHours: hours("08:00", "17:00", [0, 6]),
      minLeadTimeHours: 24,
      cancellationCutoffHours: 12,
    },
    {
      owner: zoe._id,
      name: "Serenity Spa",
      category: "spa",
      description: "Relaxing massages, facials and body treatments.",
      location: "Austin, TX",
      images: [],
      openingHours: hours("09:00", "18:00"),
      minLeadTimeHours: 12,
      cancellationCutoffHours: 24,
    },
    {
      owner: mia._id,
      name: "Pulse Fitness",
      category: "fitness",
      description: "Personal training and drop-in fitness classes.",
      location: "Denver, CO",
      images: [],
      openingHours: hours("06:00", "22:00"),
      minLeadTimeHours: 1,
      cancellationCutoffHours: 2,
    },
  ]);
  const [glow, barbers, clinic, spa, fitness] = businesses;

  const serviceRows = [
    [glow, "Cut & Style", 45, 55, 0, 0],
    [glow, "Balayage", 120, 150, 15, 15],
    [glow, "Blowout", 30, 35, 0, 0],
    [barbers, "Classic Cut", 30, 30, 0, 0],
    [barbers, "Beard Trim", 15, 15, 0, 0],
    [barbers, "Cut & Beard", 45, 42, 0, 0],
    [clinic, "Consultation", 30, 40, 0, 0],
    [clinic, "Therapy Session", 60, 95, 15, 0],
    [spa, "Swedish Massage", 60, 90, 0, 0],
    [spa, "Deep Tissue", 90, 120, 0, 15],
    [spa, "Facial", 45, 70, 0, 0],
    [fitness, "PT Session", 60, 75, 0, 0],
    [fitness, "Class Drop-in", 45, 20, 0, 0],
  ];
  const services = await Service.create(
    serviceRows.map(
      ([business, name, durationMin, price, bufferBeforeMin, bufferAfterMin]) => ({
        business: business._id,
        name,
        description: `${name} appointment`,
        durationMin,
        price,
        bufferBeforeMin,
        bufferAfterMin,
        active: true,
      }),
    ),
  );
  const service = (business, name) =>
    services.find(
      (item) =>
        item.business.toString() === business._id.toString() && item.name === name,
    );

  const plans = [
    [glow, "Cut & Style", cody, 2, "pending", 0, ""],
    [glow, "Blowout", liam, 2, "confirmed", 1, ""],
    [barbers, "Classic Cut", noah, 3, "pending", 0, ""],
    [clinic, "Consultation", cody, 1, "confirmed", 0, ""],
    [spa, "Swedish Massage", mia, 4, "pending", 0, ""],
    [fitness, "PT Session", zoe, 2, "confirmed", 0, ""],
    [glow, "Balayage", cody, -3, "completed", 0, ""],
    [glow, "Cut & Style", liam, -5, "completed", 0, ""],
    [barbers, "Cut & Beard", noah, -2, "completed", 0, ""],
    [spa, "Facial", cody, -4, "completed", 0, ""],
    [clinic, "Therapy Session", liam, -6, "completed", 0, ""],
    [glow, "Blowout", noah, -1, "cancelled", 0, "Customer rescheduled"],
    [clinic, "Consultation", cody, 5, "cancelled", 0, "Clinic closed that day"],
  ];
  const appointments = await Appointment.create(
    plans.map(([business, name, customer, offset, status, extraSlot, reason]) => {
      const item = service(business, name);
      const start = pickSlot(business, offset + extraSlot, item.durationMin);
      const cancelled = status === "cancelled";
      return {
        business: business._id,
        service: item._id,
        customer: customer._id,
        start,
        end: new Date(start.getTime() + item.durationMin * 60 * 1000),
        durationMin: item.durationMin,
        price: item.price,
        status,
        slotKeys: cancelled
          ? []
          : slotKeysFor(start, item.durationMin, item.bufferBeforeMin, item.bufferAfterMin),
        cancelReason: reason,
      };
    }),
  );

  const reviewPlans = [
    [6, cody, 5, "Excellent color work and a great stylist."],
    [7, liam, 4, "Friendly team, good cut, slightly busy that day."],
    [8, noah, 5, "Best haircut in town."],
    [9, cody, 3, "Relaxing but the room was a little cold."],
    [10, liam, 5, "Very attentive and professional."],
  ];
  const reviews = await Review.create(
    reviewPlans.map(([index, author, rating, comment]) => ({
      appointment: appointments[index]._id,
      business: appointments[index].business,
      author: author._id,
      rating,
      comment,
    })),
  );

  const totals = new Map();
  for (const review of reviews) {
    const key = review.business.toString();
    const current = totals.get(key) ?? { sum: 0, count: 0 };
    current.sum += review.rating;
    current.count += 1;
    totals.set(key, current);
  }
  await Promise.all(
    [...totals.entries()].map(([id, value]) =>
      Business.updateOne(
        { _id: id },
        {
          $set: {
            ratingSum: value.sum,
            ratingCount: value.count,
            ratingAvg: Math.round((value.sum / value.count) * 100) / 100,
          },
        },
      ),
    ),
  );

  await Favorite.create([
    { user: cody._id, business: glow._id },
    { user: cody._id, business: spa._id },
    { user: liam._id, business: clinic._id },
  ]);

  console.log(
    `Seeded ${users.length} users, ${businesses.length} businesses, ${services.length} services, ` +
      `${appointments.length} appointments, ${reviews.length} reviews, 3 favorites.`,
  );
  console.log("Demo accounts (password123): owner@example.com, customer@example.com, mia@example.com, zoe@example.com");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
