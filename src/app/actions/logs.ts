"use server"

import { z } from "zod"
import { LOG_SELECT } from "@/lib/calendar/log-select"
import { createClient } from "@/lib/supabase/server"
import type { Activity, CalendarLog } from "@/lib/types/app"

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

const saveLogSchema = z
  .object({
    id: z.uuid().optional(),
    circleId: z.uuid(),
    activityId: z.uuid().optional(),
    name: z.string().trim().min(1, "Pick or name an activity").max(80),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    icon: z.string().min(1),
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: "End time must be after start time",
  })

export type SaveLogInput = z.input<typeof saveLogSchema>

async function getAuthed() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

type Supabase = Awaited<ReturnType<typeof createClient>>

async function upsertActivity(
  supabase: Supabase,
  ownerId: string,
  input: { activityId?: string; name: string; color: string; icon: string }
): Promise<Result<Activity>> {
  if (input.activityId) {
    const { data, error } = await supabase
      .from("activities")
      .update({ color: input.color, icon: input.icon })
      .eq("id", input.activityId)
      .eq("owner_id", ownerId)
      .select()
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, data }
  }

  const { data, error } = await supabase
    .from("activities")
    .upsert(
      { owner_id: ownerId, name: input.name, color: input.color, icon: input.icon },
      { onConflict: "owner_id,name" }
    )
    .select()
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, data }
}

export async function saveLog(
  input: SaveLogInput
): Promise<Result<{ log: CalendarLog; activity: Activity }>> {
  const parsed = saveLogSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const v = parsed.data

  const { supabase, user } = await getAuthed()
  if (!user) return { ok: false, error: "Not signed in" }

  const activity = await upsertActivity(supabase, user.id, v)
  if (!activity.ok) return activity

  const values = {
    circle_id: v.circleId,
    activity_id: activity.data.id,
    start_at: v.startAt,
    end_at: v.endAt,
  }

  const query = v.id
    ? supabase.from("activity_logs").update(values).eq("id", v.id).eq("user_id", user.id)
    : supabase.from("activity_logs").insert({ ...values, user_id: user.id })

  const { data, error } = await query.select(LOG_SELECT).single()
  if (error) return { ok: false, error: error.message }

  return { ok: true, data: { log: data as CalendarLog, activity: activity.data } }
}

export async function moveLog(id: string, startAt: string, endAt: string): Promise<Result<CalendarLog>> {
  if (new Date(endAt) <= new Date(startAt)) return { ok: false, error: "End time must be after start time" }

  const { supabase, user } = await getAuthed()
  if (!user) return { ok: false, error: "Not signed in" }

  const { data, error } = await supabase
    .from("activity_logs")
    .update({ start_at: startAt, end_at: endAt })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(LOG_SELECT)
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as CalendarLog }
}

export async function deleteLog(id: string): Promise<Result<null>> {
  const { supabase, user } = await getAuthed()
  if (!user) return { ok: false, error: "Not signed in" }

  const { error } = await supabase.from("activity_logs").delete().eq("id", id).eq("user_id", user.id)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: null }
}

export async function joinLog(
  logId: string
): Promise<Result<{ log: CalendarLog; activity: Activity }>> {
  const { supabase, user } = await getAuthed()
  if (!user) return { ok: false, error: "Not signed in" }

  const { data: source, error: sourceError } = await supabase
    .from("activity_logs")
    .select(LOG_SELECT)
    .eq("id", logId)
    .single()
  if (sourceError || !source) return { ok: false, error: sourceError?.message ?? "Activity not found" }

  const original = source as CalendarLog
  if (original.user_id === user.id) return { ok: false, error: "This is already on your calendar" }

  const { data: existing } = await supabase
    .from("activity_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("joined_from_log_id", logId)
    .maybeSingle()
  if (existing) return { ok: false, error: "You've already joined this" }

  const { data: mine } = await supabase
    .from("activities")
    .select()
    .eq("owner_id", user.id)
    .eq("name", original.activity.name)
    .maybeSingle()

  let activity = mine
  if (!activity) {
    const { data, error } = await supabase
      .from("activities")
      .insert({
        owner_id: user.id,
        name: original.activity.name,
        color: original.activity.color,
        icon: original.activity.icon,
      })
      .select()
      .single()
    if (error) return { ok: false, error: error.message }
    activity = data
  }

  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: user.id,
      circle_id: original.circle_id,
      activity_id: activity.id,
      start_at: original.start_at,
      end_at: original.end_at,
      joined_from_log_id: original.id,
    })
    .select(LOG_SELECT)
    .single()
  if (error) return { ok: false, error: error.message }

  return { ok: true, data: { log: data as CalendarLog, activity } }
}
