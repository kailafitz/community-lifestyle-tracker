"use client"

/**
 * Chrome above the calendar grid.
 *
 * Week navigation (today / prev / next), view title from FullCalendar, and the
 * quick "Log activity" action. Stateless: parent supplies callbacks tied to
 * useCircleCalendar’s calendar API and openQuickLog.
 */

import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  title: string
  dayView?: boolean
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  onLogActivity: () => void
}

export function CalendarToolbar({ title, dayView, onToday, onPrev, onNext, onLogActivity }: Props) {
  const step = dayView ? "day" : "week"

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b px-2 py-2 sm:h-12 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-4 sm:py-0">
      <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
        <Button variant="outline" size="sm" onClick={onToday} className="shrink-0">
          Today
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Previous ${step}`} onClick={onPrev}>
          <ChevronLeft />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Next ${step}`} onClick={onNext}>
          <ChevronRight />
        </Button>
        <h1 className="ml-1 min-w-0 flex-1 truncate text-sm font-semibold sm:ml-2 sm:flex-none sm:whitespace-nowrap">
          {title}
        </h1>
      </div>
      <Button size="sm" className="w-full shrink-0 sm:w-auto" aria-label="Log activity" onClick={onLogActivity}>
        <Plus />
        <span className="sm:hidden">Log</span>
        <span className="hidden sm:inline">Log activity</span>
      </Button>
    </div>
  )
}
