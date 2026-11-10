"use client"

/**
 * Create, edit, and delete activity logs on the calendar.
 *
 * Modal form: activity picker, time range, circle, save/delete via server
 * actions. Parent (WeekCalendar) holds draft state and refreshes local logs
 * through onSaved / onDeleted callbacks from useCircleCalendar.
 */

import { addDays, format, parse } from "date-fns"
import { Check, ChevronsUpDown, Loader2, Plus, Trash2 } from "lucide-react"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { deleteLog, saveLog } from "@/app/actions/logs"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
  DEFAULT_COLOR,
  DEFAULT_ICON,
  getActivityIcon,
} from "@/lib/activity-style"
import type { Activity, CalendarLog, Circle } from "@/lib/types/app"
import { cn } from "@/lib/utils"

export type LogDraft = {
  id?: string
  circleId: string
  start: Date
  end: Date
  activityId?: string
  name?: string
  color?: string
  icon?: string
}

type Props = {
  draft: LogDraft | null
  onClose: () => void
  activities: Activity[]
  circles: Pick<Circle, "id" | "name">[]
  onSaved: (log: CalendarLog, activity: Activity) => void
  onDeleted: (id: string) => void
}

export function LogActivityDialog({ draft, onClose, ...rest }: Props) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {draft && (
          <LogForm key={draft.id ?? draft.start.toISOString()} draft={draft} onClose={onClose} {...rest} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function LogForm({ draft, onClose, activities, circles, onSaved, onDeleted }: Props & { draft: LogDraft }) {
  const [activityId, setActivityId] = useState(draft.activityId)
  const [name, setName] = useState(draft.name ?? "")
  const [color, setColor] = useState(draft.color ?? DEFAULT_COLOR)
  const [icon, setIcon] = useState(draft.icon ?? DEFAULT_ICON)
  const [circleId, setCircleId] = useState(draft.circleId)
  const [date, setDate] = useState(format(draft.start, "yyyy-MM-dd"))
  const [startTime, setStartTime] = useState(format(draft.start, "HH:mm"))
  const [endTime, setEndTime] = useState(format(draft.end, "HH:mm"))
  const [pending, startTransition] = useTransition()

  const { start, end, overnight } = useMemo(() => {
    const start = parse(`${date} ${startTime}`, "yyyy-MM-dd HH:mm", new Date())
    let end = parse(`${date} ${endTime}`, "yyyy-MM-dd HH:mm", new Date())
    const overnight = end <= start
    if (overnight) end = addDays(end, 1)
    return { start, end, overnight }
  }, [date, startTime, endTime])

  const valid = name.trim() && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())

  function selectActivity(activity: Activity) {
    setActivityId(activity.id)
    setName(activity.name)
    setColor(activity.color)
    setIcon(activity.icon)
  }

  function createActivity(newName: string) {
    setActivityId(undefined)
    setName(newName.trim())
  }

  function submit() {
    startTransition(async () => {
      const result = await saveLog({
        id: draft.id,
        circleId,
        activityId,
        name,
        color,
        icon,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      })
      if (!result.ok) return void toast.error(result.error)
      onSaved(result.data.log, result.data.activity)
      onClose()
    })
  }

  function remove() {
    if (!draft.id) return
    const id = draft.id
    startTransition(async () => {
      const result = await deleteLog(id)
      if (!result.ok) return void toast.error(result.error)
      onDeleted(id)
      onClose()
    })
  }

  const Icon = getActivityIcon(icon)

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) submit()
      }}
    >
      <DialogHeader>
        <DialogTitle>{draft.id ? "Edit activity" : "Log an activity"}</DialogTitle>
        <DialogDescription>Everyone in the circle will see this on the shared calendar.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label>Activity</Label>
        <ActivityCombobox
          activities={activities}
          selectedId={activityId}
          name={name}
          color={color}
          icon={<Icon className="size-4" style={{ color }} />}
          onSelect={selectActivity}
          onCreate={createActivity}
        />
        {name && !activityId && (
          <p className="text-xs text-muted-foreground">New activity. It&apos;ll be saved to your list for next time.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Colour</Label>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              onClick={() => setColor(c)}
              className={cn(
                "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition",
                color === c && "ring-2"
              )}
              style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }}
            >
              {color === c && <Check className="size-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Icon</Label>
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
          {Object.entries(ACTIVITY_ICONS).map(([key, IconOption]) => (
            <button
              key={key}
              type="button"
              aria-label={key}
              onClick={() => setIcon(key)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:bg-muted",
                icon === key && "border-current bg-muted"
              )}
              style={icon === key ? { color } : undefined}
            >
              <IconOption className="size-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <Label htmlFor="log-date">Date</Label>
          <Input id="log-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-start">Start</Label>
          <Input id="log-start" type="time" step={900} value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-end">
            End {overnight && <span className="text-xs font-normal text-muted-foreground">(+1 day)</span>}
          </Label>
          <Input id="log-end" type="time" step={900} value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>
      </div>

      {circles.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Label>Circle</Label>
          <Select value={circleId} onValueChange={setCircleId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {circles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DialogFooter className="sm:justify-between">
        {draft.id ? (
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            <Trash2 /> Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !valid}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

function ActivityCombobox({
  activities,
  selectedId,
  name,
  color,
  icon,
  onSelect,
  onCreate,
}: {
  activities: Activity[]
  selectedId?: string
  name: string
  color: string
  icon: React.ReactNode
  onSelect: (activity: Activity) => void
  onCreate: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const q = query.trim().toLowerCase()
  const matches = q ? activities.filter((a) => a.name.toLowerCase().includes(q)) : activities
  const exact = activities.some((a) => a.name.toLowerCase() === q)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between font-normal"
          style={name ? { borderColor: color } : undefined}
        >
          <span className="flex min-w-0 items-center gap-2">
            {name ? icon : null}
            <span className={cn("truncate", !name && "text-muted-foreground")}>
              {name || "Choose or create an activity"}
            </span>
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or type a new activity..." value={query} onValueChange={setQuery} />
          <CommandList>
            {!q && activities.length === 0 && <CommandEmpty>Type a name to create your first activity.</CommandEmpty>}
            {matches.length > 0 && (
              <CommandGroup heading="Your activities">
                {matches.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.icon)
                  return (
                    <CommandItem
                      key={activity.id}
                      value={activity.id}
                      data-checked={activity.id === selectedId}
                      onSelect={() => {
                        onSelect(activity)
                        setQuery("")
                        setOpen(false)
                      }}
                    >
                      <span
                        className="flex size-5 items-center justify-center rounded"
                        style={{ backgroundColor: activity.color }}
                      >
                        <ActivityIcon className="size-3 text-white" />
                      </span>
                      {activity.name}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
            {q && !exact && (
              <CommandGroup>
                <CommandItem
                  value={`create:${q}`}
                  onSelect={() => {
                    onCreate(query)
                    setQuery("")
                    setOpen(false)
                  }}
                >
                  <Plus /> Create &ldquo;{query.trim()}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
