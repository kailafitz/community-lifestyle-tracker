import { CalendarHeart } from "lucide-react"
import { CircleSwitcher } from "@/components/circles/CircleSwitcher"
import { InviteDialog } from "@/components/circles/InviteDialog"
import { PendingInvitesMenu } from "@/components/circles/PendingInvitesMenu"
import { MemberAvatars } from "@/components/dashboard/MemberAvatars"
import { UserMenu } from "@/components/profile/UserMenu"
import type { Circle, MemberProfile, PendingInvite, Profile } from "@/lib/types/app"

export function DashboardHeader({
  profile,
  circles,
  currentCircle,
  members,
  invites,
}: {
  profile: Profile
  circles: Pick<Circle, "id" | "name">[]
  currentCircle: Pick<Circle, "id" | "name"> | null
  members: MemberProfile[]
  invites: PendingInvite[]
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-2 sm:gap-4 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <CalendarHeart className="size-5 shrink-0 text-indigo-500" />
        <CircleSwitcher circles={circles} currentId={currentCircle?.id ?? null} />
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {currentCircle && (
          <>
            <div className="hidden sm:block">
              <MemberAvatars members={members} />
            </div>
            <InviteDialog circleId={currentCircle.id} circleName={currentCircle.name} />
          </>
        )}
        <PendingInvitesMenu invites={invites} />
        <UserMenu profile={profile} />
      </div>
    </header>
  )
}
