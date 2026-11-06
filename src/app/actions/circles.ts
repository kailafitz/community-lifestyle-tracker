"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { inviteManyToCircle } from "./invites"

export async function createCircle(name: string, inviteEmails: string[] = []) {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false as const, error: "Give your circle a name" }

  const supabase = await createClient()
  const { data: circleId, error } = await supabase.rpc("create_circle", { circle_name: trimmed })
  if (error || !circleId) return { ok: false as const, error: error?.message ?? "Could not create circle" }

  const invites = inviteEmails.length ? await inviteManyToCircle(circleId, inviteEmails) : []

  revalidatePath("/dashboard")
  return { ok: true as const, circleId, invites }
}
