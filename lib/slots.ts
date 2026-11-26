type HoursLike = { day: number; open: string; close: string; closed: boolean };

export const SLOT_MINUTES = 15;
const MS_PER_MIN = 60_000;
const SLOT_MS = SLOT_MINUTES * MS_PER_MIN;

export type Slot = {
  start: Date;
  end: Date;
  keys: string[];
};

export function parseTime(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dayStart(dateKeyString: string): Date {
  return new Date(`${dateKeyString}T00:00:00.000Z`);
}

export function isAligned(date: Date): boolean {
  return date.getTime() % SLOT_MS === 0;
}

export function slotKeysFor(start: Date, durationMin: number): string[] {
  const keys: string[] = [];
  const from = start.getTime();
  const until = from + durationMin * MS_PER_MIN;
  for (let time = from; time < until; time += SLOT_MS) {
    keys.push(new Date(time).toISOString());
  }
  return keys;
}

export function candidateSlots(
  hours: HoursLike[],
  dateKeyString: string,
  durationMin: number,
  now: Date = new Date(),
): Slot[] {
  const base = dayStart(dateKeyString);
  if (Number.isNaN(base.getTime())) return [];

  const entry = hours.find((hour) => hour.day === base.getUTCDay());
  if (!entry || entry.closed) return [];

  const open = parseTime(entry.open);
  const close = parseTime(entry.close);
  if (open === null || close === null || close <= open) return [];

  const slots: Slot[] = [];
  const baseMs = base.getTime();
  for (let minute = open; minute + durationMin <= close; minute += SLOT_MINUTES) {
    const start = new Date(baseMs + minute * MS_PER_MIN);
    if (start.getTime() <= now.getTime()) continue;
    const end = new Date(baseMs + (minute + durationMin) * MS_PER_MIN);
    slots.push({ start, end, keys: slotKeysFor(start, durationMin) });
  }
  return slots;
}

export function availableSlots(slots: Slot[], bookedKeys: Set<string>): Slot[] {
  return slots.filter((slot) => !slot.keys.some((key) => bookedKeys.has(key)));
}
