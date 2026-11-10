"use client"

/**
 * Read-only view of another member’s log with "Join" action.
 *
 * Anchored to the clicked event on the grid. Join duplicates the slot onto the
 * current user’s calendar via joinLog; parent upserts the new log/activity.
 * Not used for the current user’s events (those open LogActivityDialog instead).
 */

import { differenceInMinutes, format } from "date-fns"
import { Check, Clock, Loader2, UserPlus } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"
import { joinLog } from "@/app/actions/logs"
import { MemberAvatars } from "@/components/dashboard/MemberAvatars"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { getActivityIcon } from "@/lib/activity-style"
import type { Activity, CalendarLog, MemberProfile } from "@/lib/types/app"
import { initials } from "@/lib/utils"

type Props = {
  details: { log: CalendarLog; rect: DOMRect } | null
  onClose: () => void
  logs: CalendarLog[]
  membersById: Map<string, MemberProfile>
  currentUserId: string
  onJoined: (log: CalendarLog, activity: Activity) => void
}

export function LogDetailsPopover({ details, onClose, logs, membersById, currentUserId, onJoined }: Props) {
  const [pending, startTransition] = useTransition()

  if (!details) return null
  const { log, rect } = details

  const owner = membersById.get(log.user_id)
  const joiners = logs.filter((l) => l.joined_from_log_id === log.id)
  const joinerProfiles = joiners.flatMap((l) => {
    const m = membersById.get(l.user_id)
    return m ? [m] : []
  })
  const alreadyJoined = joiners.some((l) => l.user_id === currentUserId)
  const source = log.joined_from_log_id ? logs.find((l) => l.id === log.joined_from_log_id) : undefined
  const sourceOwner = source ? membersById.get(source.user_id) : undefined

  const Icon = getActivityIcon(log.activity.icon)
  const start = new Date(log.start_at)
  const end = new Date(log.end_at)
  const minutes = differenceInMinutes(end, start)
  const duration = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}` : `${minutes}m`

  function join() {
    startTransition(async () => {
      const result = await joinLog(log.id)
      if (!result.ok) return void toast.error(result.error)
      onJoined(result.data.log, result.data.activity)
      toast.success(`Joined ${owner?.full_name ?? "them"} for ${log.activity.name}`)
      onClose()
    })
  }

  return (
    <Popover open onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor asChild>
        <div
          className="pointer-events-none fixed"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      </PopoverAnchor>
      <PopoverContent key={log.id} side="right" align="start" className="w-72 gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: log.activity.color }}
          >
            <Icon className="size-5 text-white" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{log.activity.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {format(start, "EEE d MMM, h:mm a")} &ndash; {format(end, "h:mm a")} &middot; {duration.trim()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Avatar size="sm">
            {owner?.avatar_url && <AvatarImage src={owner.avatar_url} alt="" />}
            <AvatarFallback>{initials(owner?.full_name, owner?.email)}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{owner?.full_name ?? owner?.email ?? "A circle member"}</span>
        </div>

        {source && (
          <p className="text-xs text-muted-foreground">
            Joined from {sourceOwner?.full_name ?? "a member"}&apos;s activity
          </p>
        )}

        {joinerProfiles.length > 0 && (
          <div className="flex items-center gap-2">
            <MemberAvatars members={joinerProfiles} />
            <span className="text-xs text-muted-foreground">
              {joinerProfiles.length} joined
            </span>
          </div>
        )}

        {alreadyJoined ? (
          <Button variant="secondary" disabled>
            <Check /> You joined this
          </Button>
        ) : (
          <Button onClick={join} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
            Join
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
