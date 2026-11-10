"use client"

/**
 * FullCalendar dayHeaderContent for the week view.
 *
 * Presentational only—weekday label and date pill with a today highlight.
 * Extracted so WeekCalendar does not inline layout markup in FullCalendar props.
 */

import type { DayHeaderContentArg } from "@fullcalendar/core"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function CalendarDayHeader({ arg }: { arg: DayHeaderContentArg }) {
  return (
    <div className="flex flex-col items-center py-1">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {format(arg.date, "EEE")}
      </span>
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full text-base font-semibold",
          arg.isToday && "bg-indigo-500 text-white"
        )}
      >
        {format(arg.date, "d")}
      </span>
    </div>
  )
}
