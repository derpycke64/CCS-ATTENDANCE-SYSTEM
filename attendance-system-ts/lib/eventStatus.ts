export type EventStatus = 'ongoing' | 'upcoming' | 'completed' | 'cancelled' | 'unscheduled';

export interface EventRow {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  organization?: string | null;
  banner_url?: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  start_time?: string | null;
  end_time?: string | null;
  is_cancelled?: boolean | null;
}

// Status is derived from the real start/end times, never assigned by hand.
export function getEventStatus(
  e: Pick<EventRow, 'start_time' | 'end_time' | 'is_cancelled'>,
  now: Date = new Date()
): EventStatus {
  if (e.is_cancelled) return 'cancelled';
  if (!e.start_time || !e.end_time) return 'unscheduled';
  if (now < new Date(e.start_time)) return 'upcoming';
  if (now > new Date(e.end_time)) return 'completed';
  return 'ongoing';
}

export const STATUS_LABEL: Record<EventStatus, string> = {
  ongoing: 'Ongoing',
  upcoming: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
  unscheduled: 'Schedule Not Set',
};

export const ACTION_LABEL: Record<Exclude<EventStatus, 'ongoing'>, string> = {
  upcoming: 'Attendance Not Yet Available',
  completed: 'Event Completed',
  cancelled: 'Event Cancelled',
  unscheduled: 'Attendance Not Yet Available',
};

export function formatEventRange(start?: string | null, end?: string | null): string {
  if (!start) return 'Date to be announced';
  const s = new Date(start);
  const d = (x: Date) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const t = (x: Date) => x.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!end) return `${d(s)} • ${t(s)}`;
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) return `${d(s)} • ${t(s)} – ${t(e)}`;
  return `${d(s)} – ${d(e)}`;
}
