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
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  onLogActivity: () => void
}

export function CalendarToolbar({ title, onToday, onPrev, onNext, onLogActivity }: Props) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
      <div className="flex min-w-0 items-center gap-1">
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Previous week" onClick={onPrev}>
          <ChevronLeft />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Next week" onClick={onNext}>
          <ChevronRight />
        </Button>
        <h1 className="ml-2 truncate text-sm font-semibold whitespace-nowrap">{title}</h1>
      </div>
      <Button size="sm" aria-label="Log activity" onClick={onLogActivity}>
        <Plus />
        <span className="hidden sm:inline">Log activity</span>
      </Button>
    </div>
  )
}
