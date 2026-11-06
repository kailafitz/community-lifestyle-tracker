"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type InviteResult =
  | { ok: true; email: string; delivery: "email" | "in_app" }
  | { ok: false; email: string; error: string }

export async function inviteToCircle(circleId: string, rawEmail: string): Promise<InviteResult> {
  const email = rawEmail.trim().toLowerCase()
  if (!z.email().safeParse(email).success) {
    return { ok: false, email, error: "Not a valid email" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, email, error: "Not signed in" }
  if (user.email?.toLowerCase() === email) {
    return { ok: false, email, error: "You're already in this circle" }
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existing) {
    const { data: membership } = await admin
      .from("circle_members")
      .select("user_id")
      .eq("circle_id", circleId)
      .eq("user_id", existing.id)
      .maybeSingle()
    if (membership) return { ok: false, email, error: "Already a member" }
  }

  const { error: insertError } = await supabase
    .from("circle_invites")
    .insert({ circle_id: circleId, email, invited_by: user.id })

  if (insertError) {
    const error = insertError.code === "23505" ? "Already invited" : insertError.message
    return { ok: false, email, error }
  }

  revalidatePath("/dashboard")

  if (existing) return { ok: true, email, delivery: "in_app" }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000"
  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/onboarding`,
    data: { needs_password: true },
  })
  if (emailError) {
    return { ok: false, email, error: `Invite saved, but the email failed: ${emailError.message}` }
  }

  return { ok: true, email, delivery: "email" }
}

export async function inviteManyToCircle(circleId: string, emails: string[]) {
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
  return Promise.all(unique.map((email) => inviteToCircle(circleId, email)))
}

export async function respondToInvite(inviteId: string, accept: boolean) {
  const supabase = await createClient()
  const { data: circleId, error } = await supabase.rpc(accept ? "accept_invite" : "decline_invite", {
    invite_id: inviteId,
  })
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/dashboard")
  return { ok: true as const, circleId }
}
