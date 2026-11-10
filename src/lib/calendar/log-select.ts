/**
 * Shared Supabase select fragment for activity logs.
 *
 * Single source of truth for the activity_logs → activities embed used by the
 * browser client (use-circle-calendar), realtime refetches, and server actions
 * (logs.ts). Change here when the CalendarLog shape or join columns change.
 */
export const LOG_SELECT = "*, activity:activities(id, name, color, icon)" as const
