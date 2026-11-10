"use client"

/**
 * FullCalendar eventContent renderer.
 *
 * Draws each time-grid event: real logs (own vs circle-mate styling), drag/resize
 * previews, and the dashed "New activity" mirror for empty-grid selection.
 * Uses readEventLog so mirror events without extendedProps never crash the tree.
 */

import type { EventContentArg } from "@fullcalendar/core"
import { differenceInMinutes } from "date-fns"
import { Link2 } from "lucide-react"
import { readEventLog } from "@/components/calendar/calendar-events"
import { getActivityIcon } from "@/lib/activity-style"
import type { MemberProfile } from "@/lib/types/app"
import { cn, initials } from "@/lib/utils"

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

export function CalendarEventBlock({
  arg,
  membersById,
}: {
  arg: EventContentArg
  membersById: Map<string, MemberProfile>
}) {
  const minutes = arg.event.end && arg.event.start ? differenceInMinutes(arg.event.end, arg.event.start) : 60
  const compact = minutes < 45
  const log = readEventLog(arg.event.extendedProps)

  if (arg.isMirror && !log) {
    return <NewActivityMirror arg={arg} compact={compact} />
  }

  if (!log) return null

  const own = (arg.event.extendedProps as { own?: boolean }).own ?? false
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
