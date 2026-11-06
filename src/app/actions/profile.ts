"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function saveProfile(input: {
  fullName: string
  avatarUrl: string | null
  password?: string
}) {
  const fullName = input.fullName.trim()
  if (!fullName) return { ok: false as const, error: "Tell us your name" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Not signed in" }

  if (input.password !== undefined) {
    if (input.password.length < 6) {
      return { ok: false as const, error: "Password must be at least 6 characters" }
    }
    const { error } = await supabase.auth.updateUser({
      password: input.password,
      data: { needs_password: false },
    })
    if (error) return { ok: false as const, error: error.message }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, avatar_url: input.avatarUrl })
    .eq("id", user.id)
  if (error) return { ok: false as const, error: error.message }

  revalidatePath("/", "layout")
  return { ok: true as const }
}

export async function completeOnboarding(circleId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id)
  if (error) return { ok: false as const, error: error.message }

  redirect(`/dashboard?circle=${circleId}`)
}
