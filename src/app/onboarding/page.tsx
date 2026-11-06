import { redirect } from "next/navigation"
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow"
import { createClient } from "@/lib/supabase/server"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: invites }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.rpc("get_my_pending_invites"),
    supabase.from("circle_members").select("circle_id, circles(name)").eq("user_id", user.id),
  ])

  const existingCircles = (memberships ?? []).flatMap((m) =>
    m.circles ? [{ id: m.circle_id, name: m.circles.name }] : []
  )

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <OnboardingFlow
        userId={user.id}
        email={user.email ?? ""}
        needsPassword={Boolean(user.user_metadata?.needs_password)}
        initialName={profile?.full_name ?? ""}
        initialAvatarUrl={profile?.avatar_url ?? null}
        invites={invites ?? []}
        existingCircles={existingCircles}
      />
    </main>
  )
}
