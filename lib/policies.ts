const MS_PER_HOUR = 60 * 60 * 1000;

export type BookingPolicies = {
  minLeadTimeHours: number;
  cancellationCutoffHours: number;
};

export function meetsLeadTime(
  start: Date,
  minLeadTimeHours: number,
  now: Date = new Date(),
): boolean {
  return start.getTime() - now.getTime() >= Math.max(0, minLeadTimeHours) * MS_PER_HOUR;
}

export function withinCancellationCutoff(
  start: Date,
  cancellationCutoffHours: number,
  now: Date = new Date(),
): boolean {
  return start.getTime() - now.getTime() < Math.max(0, cancellationCutoffHours) * MS_PER_HOUR;
}
