"use client"

/**
 * Circle calendar state and side effects.
 *
 * Owns logs/activities for the active circle, visible range, dialog/popover
 * state, and conversion of logs → FullCalendar events. Loads logs for the
 * current view window, subscribes to Supabase realtime, and implements
 * select/click/drag handlers that call server actions. UI components consume
 * the returned API; they do not fetch or mutate circle logs directly.
 */

import type {
  DateSelectArg,
  DatesSetArg,
  EventChangeArg,
  EventClickArg,
  EventInput,
} from "@fullcalendar/core"
import type FullCalendar from "@fullcalendar/react"
import { addHours, roundToNearestMinutes } from "date-fns"
import { type RefObject, useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { moveLog } from "@/app/actions/logs"
import type { LogDraft } from "@/components/calendar/LogActivityDialog"
import { logToEditDraft, logsToEventInputs, readEventLog, selectionEndTime } from "@/components/calendar/calendar-events"
import type { CalendarViewRange, LogDetailsState } from "@/components/calendar/types"
import { LOG_SELECT } from "@/lib/calendar/log-select"
import { createClient } from "@/lib/supabase/client"
import type { Activity, CalendarLog } from "@/lib/types/app"

type Options = {
  circleId: string
  currentUserId: string
  initialActivities: Activity[]
  calendarRef: RefObject<FullCalendar | null>
}

export function useCircleCalendar({ circleId, currentUserId, initialActivities, calendarRef }: Options) {
  const supabase = useMemo(() => createClient(), [])

  const [logs, setLogs] = useState<CalendarLog[]>([])
  const [activities, setActivities] = useState(initialActivities)
  const [range, setRange] = useState<CalendarViewRange | null>(null)
  const [title, setTitle] = useState("")
  const [draft, setDraft] = useState<LogDraft | null>(null)
  const [details, setDetails] = useState<LogDetailsState | null>(null)

  const calendarApi = useCallback(() => calendarRef.current?.getApi(), [calendarRef])

  const upsertLog = useCallback(
    (log: CalendarLog) => {
      setLogs((prev) => {
        if (log.circle_id !== circleId) return prev.filter((l) => l.id !== log.id)
        const index = prev.findIndex((l) => l.id === log.id)
        if (index === -1) return [...prev, log]
        const next = [...prev]
        next[index] = log
        return next
      })
    },
    [circleId]
  )

  const removeLog = useCallback((id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const upsertActivity = useCallback((activity: Activity) => {
    setActivities((prev) => {
      const rest = prev.filter((a) => a.id !== activity.id)
      return [...rest, activity].sort((a, b) => a.name.localeCompare(b.name))
    })
  }, [])

  const closeDetails = useCallback(() => setDetails(null), [])

  const openDraftAt = useCallback(
    (start: Date, end: Date) => {
      setDetails(null)
      setDraft({ circleId, start, end })
    },
    [circleId]
  )

  const openQuickLog = useCallback(() => {
    const start = roundToNearestMinutes(new Date(), { nearestTo: 15, roundingMethod: "floor" })
    openDraftAt(start, addHours(start, 1))
  }, [openDraftAt])

  useEffect(() => {
    if (!range) return
    let cancelled = false
    supabase
      .from("activity_logs")
      .select(LOG_SELECT)
      .eq("circle_id", circleId)
      .lt("start_at", range.end.toISOString())
      .gt("end_at", range.start.toISOString())
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) return void toast.error(error.message)
        setLogs((data ?? []) as CalendarLog[])
      })
    return () => {
      cancelled = true
    }
  }, [supabase, circleId, range])

  useEffect(() => {
    const channel = supabase
      .channel(`circle-logs-${circleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs", filter: `circle_id=eq.${circleId}` },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id
            if (id) removeLog(id)
            return
          }
          const id = (payload.new as { id: string }).id
          const { data } = await supabase.from("activity_logs").select(LOG_SELECT).eq("id", id).maybeSingle()
          if (data) upsertLog(data as CalendarLog)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, circleId, upsertLog, removeLog])

  const events = useMemo<EventInput[]>(
    () => logsToEventInputs(logs, currentUserId),
    [logs, currentUserId]
  )

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    // FullCalendar may invoke this during its own render cycle (flushSync). Defer so React
    // is not already rendering when we update parent state.
    queueMicrotask(() => {
      setRange({ start: arg.start, end: arg.end })
      setTitle(arg.view.title)
    })
  }, [])

  const handleSelect = useCallback(
    (arg: DateSelectArg) => {
      calendarApi()?.unselect()
      openDraftAt(arg.start, selectionEndTime(arg.start, arg.end))
    },
    [calendarApi, openDraftAt]
  )

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const log = readEventLog(arg.event.extendedProps)
      if (!log) return
      if (log.user_id === currentUserId) {
        setDetails(null)
        setDraft(logToEditDraft(log))
      } else {
        setDetails({ log, rect: arg.el.getBoundingClientRect() })
      }
    },
    [currentUserId]
  )

  const handleEventChange = useCallback(
    async (arg: EventChangeArg) => {
      const { event } = arg
      if (!event.start || !event.end) return arg.revert()
      const result = await moveLog(event.id, event.start.toISOString(), event.end.toISOString())
      if (!result.ok) {
        arg.revert()
        toast.error(result.error)
        return
      }
      upsertLog(result.data)
    },
    [upsertLog]
  )

  return {
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
  }
}
