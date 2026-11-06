import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { EmptyCircles } from "@/components/dashboard/EmptyCircles"
import { WeekCalendar } from "@/components/calendar/WeekCalendar"
import { createClient } from "@/lib/supabase/server"
import type { MemberProfile } from "@/lib/types/app"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ circle?: string }>
}) {
  const { circle: requestedCircleId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: memberships }, { data: invites }, { data: activities }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("circle_members")
        .select("circle_id, circles(id, name)")
        .eq("user_id", user.id)
        .order("joined_at"),
      supabase.rpc("get_my_pending_invites"),
      supabase.from("activities").select("*").eq("owner_id", user.id).order("name"),
    ])

  if (!profile) redirect("/onboarding")

  const circles = (memberships ?? []).flatMap((m) => (m.circles ? [m.circles] : []))
  const current = circles.find((c) => c.id === requestedCircleId) ?? circles[0] ?? null

  let members: MemberProfile[] = []
  if (current) {
    const { data } = await supabase
      .from("circle_members")
      .select("profile:profiles(id, full_name, avatar_url, email)")
      .eq("circle_id", current.id)
    members = (data ?? []).flatMap((m) => (m.profile ? [m.profile] : []))
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <DashboardHeader
        profile={profile}
        circles={circles}
        currentCircle={current}
        members={members}
        invites={invites ?? []}
      />
      {current ? (
        <WeekCalendar
          key={current.id}
          circleId={current.id}
          circles={circles}
          currentUserId={user.id}
          members={members}
          initialActivities={activities ?? []}
        />
      ) : (
        <EmptyCircles />
      )}
    </div>
  )
}
