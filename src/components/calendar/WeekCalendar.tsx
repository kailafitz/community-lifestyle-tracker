"use client"

import type {
  DateSelectArg,
  DatesSetArg,
  EventChangeArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core"
import interactionPlugin from "@fullcalendar/interaction"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import { addHours, differenceInMinutes, format, roundToNearestMinutes } from "date-fns"
import { ChevronLeft, ChevronRight, Link2, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { moveLog } from "@/app/actions/logs"
import { LogActivityDialog, type LogDraft } from "@/components/calendar/LogActivityDialog"
import { LogDetailsPopover } from "@/components/calendar/LogDetailsPopover"
import { Button } from "@/components/ui/button"
import { getActivityIcon } from "@/lib/activity-style"
import { createClient } from "@/lib/supabase/client"
import type { Activity, CalendarLog, Circle, MemberProfile } from "@/lib/types/app"
import { cn, initials } from "@/lib/utils"

const LOG_SELECT = "*, activity:activities(id, name, color, icon)" as const

type Props = {
  circleId: string
  circles: Pick<Circle, "id" | "name">[]
  currentUserId: string
  members: MemberProfile[]
  initialActivities: Activity[]
}

type Range = { start: Date; end: Date }

export function WeekCalendar({ circleId, circles, currentUserId, members, initialActivities }: Props) {
  const calendarRef = useRef<FullCalendar>(null)
  const supabase = useMemo(() => createClient(), [])

  const [logs, setLogs] = useState<CalendarLog[]>([])
  const [activities, setActivities] = useState(initialActivities)
  const [range, setRange] = useState<Range | null>(null)
  const [title, setTitle] = useState("")
  const [draft, setDraft] = useState<LogDraft | null>(null)
  const [details, setDetails] = useState<{ log: CalendarLog; rect: DOMRect } | null>(null)

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

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
    () =>
      logs
        .filter((log): log is CalendarLog & { activity: CalendarLog["activity"] } => Boolean(log.activity))
        .map((log) => {
          const own = log.user_id === currentUserId
          return {
            id: log.id,
            start: log.start_at,
            end: log.end_at,
            title: log.activity.name,
            editable: own,
            backgroundColor: "transparent",
            borderColor: "transparent",
            extendedProps: { log, own },
          }
        }),
    [logs, currentUserId]
  )

  function openDraftAt(start: Date, end: Date) {
    setDetails(null)
    setDraft({ circleId, start, end })
  }

  function handleSelect(arg: DateSelectArg) {
    calendarRef.current?.getApi().unselect()
    const end = differenceInMinutes(arg.end, arg.start) <= 15 ? addHours(arg.start, 1) : arg.end
    openDraftAt(arg.start, end)
  }

  function handleEventClick(arg: EventClickArg) {
    const log = arg.event.extendedProps.log as CalendarLog
    if (log.user_id === currentUserId) {
      setDetails(null)
      setDraft({
        id: log.id,
        circleId: log.circle_id,
        start: new Date(log.start_at),
        end: new Date(log.end_at),
        activityId: log.activity.id,
        name: log.activity.name,
        color: log.activity.color,
        icon: log.activity.icon,
      })
    } else {
      setDetails({ log, rect: arg.el.getBoundingClientRect() })
    }
  }

  async function handleEventChange(arg: EventChangeArg) {
    const { event } = arg
    if (!event.start || !event.end) return arg.revert()
    const result = await moveLog(event.id, event.start.toISOString(), event.end.toISOString())
    if (!result.ok) {
      arg.revert()
      toast.error(result.error)
      return
    }
    upsertLog(result.data)
  }

  function handleDatesSet(arg: DatesSetArg) {
    setRange({ start: arg.start, end: arg.end })
    setTitle(arg.view.title)
  }

  const api = () => calendarRef.current?.getApi()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex min-w-0 items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => api()?.today()}>
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Previous week" onClick={() => api()?.prev()}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next week" onClick={() => api()?.next()}>
            <ChevronRight />
          </Button>
          <h1 className="ml-2 truncate text-sm font-semibold whitespace-nowrap">{title}</h1>
        </div>
        <Button
          size="sm"
          aria-label="Log activity"
          onClick={() => {
            const start = roundToNearestMinutes(new Date(), { nearestTo: 15, roundingMethod: "floor" })
            openDraftAt(start, addHours(start, 1))
          }}
        >
          <Plus />
          <span className="hidden sm:inline">Log activity</span>
        </Button>
      </div>

      <div
        className="calendar-shell min-h-0 flex-1"
        onPointerDownCapture={(e) => {
          if (!details) return
          const target = e.target
          if (!(target instanceof Element)) return
          if (target.closest(".fc-timegrid-event, .fc-event")) return
          setDetails(null)
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
          dayHeaderContent={(arg) => (
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
          )}
          selectable
          selectMirror
          editable
          eventDurationEditable
          events={events}
          datesSet={handleDatesSet}
          select={handleSelect}
          eventClick={handleEventClick}
          eventChange={handleEventChange}
          eventDragStart={() => setDetails(null)}
          eventResizeStart={() => setDetails(null)}
          eventContent={(arg) => <EventBlock arg={arg} membersById={membersById} />}
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
        onClose={() => setDetails(null)}
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

function NewActivityMirror({ arg, compact }: { arg: EventContentArg; compact: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full w-full overflow-hidden rounded-md border border-dashed border-indigo-400/50 bg-indigo-500/15 px-1.5 py-1 text-xs text-indigo-700 dark:text-indigo-200",
        compact ? "items-center gap-1.5" : "flex-col justify-center gap-0.5"
      )}
    >
      <span className="truncate font-semibold">New activity</span>
      {!compact && arg.timeText ? (
        <span className="truncate text-indigo-600/75 dark:text-indigo-300/75">{arg.timeText}</span>
      ) : compact && arg.timeText ? (
        <span className="ml-auto shrink-0 text-indigo-600/75 tabular-nums dark:text-indigo-300/75">{arg.timeText}</span>
      ) : null}
    </div>
  )
}

function EventBlock({
  arg,
  membersById,
}: {
  arg: EventContentArg
  membersById: Map<string, MemberProfile>
}) {
  const minutes = arg.event.end && arg.event.start ? differenceInMinutes(arg.event.end, arg.event.start) : 60
  const compact = minutes < 45

  const props = arg.event.extendedProps as { log?: CalendarLog; own?: boolean }
  const log = props.log

  // selectMirror placeholder (no log on the synthetic event); event drag/resize mirrors include extendedProps.
  if (arg.isMirror && !log?.activity) {
    return <NewActivityMirror arg={arg} compact={compact} />
  }

  if (!log?.activity) return null

  const own = props.own ?? false
  const Icon = getActivityIcon(log.activity.icon)
  const member = membersById.get(log.user_id)
  const color = log.activity.color
  const isMovePreview = arg.isMirror || arg.isResizing
  const isSourceWhileDragging = arg.isDragging

  return (
    <div
      className={cn(
        "flex h-full w-full gap-1.5 overflow-hidden rounded-md px-1.5 py-1 text-xs leading-tight transition-opacity",
        own ? "text-white shadow-sm" : "border-l-[3px] text-foreground",
        compact ? "items-center" : "flex-col",
        isSourceWhileDragging && "opacity-35",
        isMovePreview && "shadow-md ring-2 ring-foreground/10"
      )}
      style={own ? { backgroundColor: color } : { backgroundColor: `${color}26`, borderLeftColor: color }}
    >
      <div className="flex min-w-0 items-center gap-1">
        <Icon className="size-3.5 shrink-0" style={own ? undefined : { color }} />
        <span className="truncate font-semibold">{log.activity.name}</span>
        {log.joined_from_log_id && <Link2 className="size-3 shrink-0 opacity-70" />}
      </div>
      {!compact && (
        <span className={cn("truncate", own ? "text-white/80" : "text-muted-foreground")}>{arg.timeText}</span>
      )}
      <div className={cn("flex min-w-0 items-center gap-1", compact ? "ml-auto" : "mt-auto")}>
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full text-[8px] font-semibold",
            own ? "bg-white/25" : "bg-background"
          )}
        >
          {member?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            initials(member?.full_name, member?.email)
          )}
        </span>
        {!compact && (
          <span className={cn("truncate", own ? "text-white/80" : "text-muted-foreground")}>
            {own ? "You" : (member?.full_name ?? "Member")}
          </span>
        )}
      </div>
    </div>
  )
}
