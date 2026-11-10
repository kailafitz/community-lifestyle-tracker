/**
 * Pure calendar domain helpers (no React, no I/O).
 *
 * Maps between app types (CalendarLog) and FullCalendar inputs, validates
 * embedded activity data, and reads log data off event extendedProps. Keeps
 * FullCalendar-specific shaping in one place so hooks and components stay
 * declarative.
 */

import type { EventInput } from "@fullcalendar/core"
import { addHours, differenceInMinutes } from "date-fns"
import type { LogDraft } from "@/components/calendar/LogActivityDialog"
import type { CalendarEventExtendedProps, CalendarLogWithActivity } from "@/components/calendar/types"
import type { CalendarLog } from "@/lib/types/app"

export function isLogWithActivity(log: CalendarLog): log is CalendarLogWithActivity {
  return Boolean(log.activity)
}

export function logsToEventInputs(logs: CalendarLog[], currentUserId: string): EventInput[] {
  return logs.filter(isLogWithActivity).map((log) => {
    const own = log.user_id === currentUserId
    const extendedProps: CalendarEventExtendedProps = { log, own }
    return {
      id: log.id,
      start: log.start_at,
      end: log.end_at,
      title: log.activity.name,
      editable: own,
      backgroundColor: "transparent",
      borderColor: "transparent",
      extendedProps,
    }
  })
}

export function selectionEndTime(start: Date, end: Date): Date {
  return differenceInMinutes(end, start) <= 15 ? addHours(start, 1) : end
}

export function logToEditDraft(log: CalendarLogWithActivity): LogDraft {
  return {
    id: log.id,
    circleId: log.circle_id,
    start: new Date(log.start_at),
    end: new Date(log.end_at),
    activityId: log.activity.id,
    name: log.activity.name,
    color: log.activity.color,
    icon: log.activity.icon,
  }
}

export function readEventLog(extendedProps: unknown): CalendarLogWithActivity | undefined {
  const props = extendedProps as Partial<CalendarEventExtendedProps>
  const log = props.log
  return log && isLogWithActivity(log) ? log : undefined
}
