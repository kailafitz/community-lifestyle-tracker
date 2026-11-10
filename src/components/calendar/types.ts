/**
 * Shared types for the week calendar feature.
 *
 * Narrows CalendarLog to rows with an embedded activity, defines the shape of
 * FullCalendar extendedProps, and centralizes component props / UI state types.
 * Import from here instead of re-declaring calendar-specific types in each file.
 */

import type { LogDraft } from "@/components/calendar/LogActivityDialog"
import type { Activity, CalendarLog, Circle, MemberProfile } from "@/lib/types/app"

export type CalendarLogWithActivity = CalendarLog & {
  activity: NonNullable<CalendarLog["activity"]>
}

export type CalendarEventExtendedProps = {
  log: CalendarLogWithActivity
  own: boolean
}

export type LogDetailsState = {
  log: CalendarLogWithActivity
  rect: DOMRect
}

export type WeekCalendarProps = {
  circleId: string
  circles: Pick<Circle, "id" | "name">[]
  currentUserId: string
  members: MemberProfile[]
  initialActivities: Activity[]
}

export type CalendarViewRange = { start: Date; end: Date }

export type { LogDraft }
