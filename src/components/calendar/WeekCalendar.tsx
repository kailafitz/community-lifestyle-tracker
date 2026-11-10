"use client"

/**
 * Week calendar composition root.
 *
 * Mounts the circle week view: toolbar, FullCalendar instance, and overlays
 * (log dialog, join/details popover). Delegates data, realtime sync, and
 * interaction handlers to useCircleCalendar; delegates rendering to sibling
 * UI modules. This file should stay thin—mostly wiring and FullCalendar config.
 */

import interactionPlugin from "@fullcalendar/interaction"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import { useEffect, useMemo, useRef } from "react"
import { useIsMobile } from "@/hooks/use-is-mobile"
import { toast } from "sonner"
import { CalendarDayHeader } from "@/components/calendar/CalendarDayHeader"
import { CalendarEventBlock } from "@/components/calendar/CalendarEventBlock"
import { CalendarToolbar } from "@/components/calendar/CalendarToolbar"
import { LogActivityDialog } from "@/components/calendar/LogActivityDialog"
import { LogDetailsPopover } from "@/components/calendar/LogDetailsPopover"
import type { WeekCalendarProps } from "@/components/calendar/types"
import { useCircleCalendar } from "@/components/calendar/use-circle-calendar"

export function WeekCalendar({ circleId, circles, currentUserId, members, initialActivities }: WeekCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const isMobile = useIsMobile()
  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const {
    logs,
    activities,
    events,
    title,
    draft,
    setDraft,
    details,
    closeDetails,
    upsertLog,
    removeLog,
    upsertActivity,
    calendarApi,
    openQuickLog,
    handleDatesSet,
    handleSelect,
    handleEventClick,
    handleEventChange,
  } = useCircleCalendar({ circleId, currentUserId, initialActivities, calendarRef })

  const calendarView = isMobile ? "timeGridDay" : "timeGridWeek"

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const api = calendarRef.current?.getApi()
      if (!api || api.view.type === calendarView) return
      api.changeView(calendarView)
    })
    return () => cancelAnimationFrame(id)
  }, [calendarView])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CalendarToolbar
        title={title}
        dayView={isMobile}
        onToday={() => calendarApi()?.today()}
        onPrev={() => calendarApi()?.prev()}
        onNext={() => calendarApi()?.next()}
        onLogActivity={openQuickLog}
      />

      <div
        className="calendar-shell min-h-0 flex-1"
        onPointerDownCapture={(e) => {
          if (!details) return
          const target = e.target
          if (!(target instanceof Element)) return
          if (target.closest(".fc-timegrid-event, .fc-event")) return
          closeDetails()
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={false}
          height="100%"
          firstDay={1}
          allDaySlot={false}
          nowIndicator
          slotDuration="00:30:00"
          snapDuration="00:15:00"
          scrollTime={`${String(Math.max(0, new Date().getHours() - 2)).padStart(2, "0")}:00:00`}
          slotLabelFormat={{ hour: "numeric", meridiem: "short" }}
          dayHeaderContent={(arg) => <CalendarDayHeader arg={arg} />}
          selectable
          selectMirror
          editable
          eventDurationEditable
          events={events}
          datesSet={handleDatesSet}
          select={handleSelect}
          eventClick={handleEventClick}
          eventChange={handleEventChange}
          eventDragStart={closeDetails}
          eventResizeStart={closeDetails}
          eventContent={(arg) => <CalendarEventBlock arg={arg} membersById={membersById} />}
        />
      </div>

      <LogActivityDialog
        draft={draft}
        onClose={() => setDraft(null)}
        activities={activities}
        circles={circles}
        onSaved={(log, activity) => {
          upsertActivity(activity)
          upsertLog(log)
          if (log.circle_id !== circleId) {
            const name = circles.find((c) => c.id === log.circle_id)?.name
            toast.success(`Saved to ${name ?? "another circle"}`)
          }
        }}
        onDeleted={removeLog}
      />

      <LogDetailsPopover
        details={details}
        onClose={closeDetails}
        logs={logs}
        membersById={membersById}
        currentUserId={currentUserId}
        onJoined={(log, activity) => {
          upsertActivity(activity)
          upsertLog(log)
        }}
      />
    </div>
  )
}
