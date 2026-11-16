export const SLA_TARGET_HOURS: Record<string, number> = {
  urgent: 4,
  high: 12,
  normal: 24,
  low: 72,
};

export type TicketSla = {
  targetHours: number;
  ageHours: number;
  breached: boolean;
  remainingHours: number;
};

export const ticketSla = (priority: string, createdAt: string | Date, status: string, now = Date.now()): TicketSla | null => {
  if (status === "resolved" || status === "closed") return null;
  const targetHours = SLA_TARGET_HOURS[priority] ?? SLA_TARGET_HOURS.normal;
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return null;
  const ageHours = Math.max(0, (now - createdMs) / 3_600_000);
  return {
    targetHours,
    ageHours: Math.round(ageHours * 10) / 10,
    breached: ageHours > targetHours,
    remainingHours: Math.round((targetHours - ageHours) * 10) / 10,
  };
};
