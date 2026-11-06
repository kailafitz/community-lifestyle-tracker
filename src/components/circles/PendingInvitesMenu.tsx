"use client"

import { Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { respondToInvite } from "@/app/actions/invites"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { PendingInvite } from "@/lib/types/app"

export function PendingInvitesMenu({ invites }: { invites: PendingInvite[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function respond(invite: PendingInvite, accept: boolean) {
    startTransition(async () => {
      const result = await respondToInvite(invite.id, accept)
      if (!result.ok) return void toast.error(result.error)
      if (accept) {
        toast.success(`You joined ${invite.circle_name}`)
        router.push(`/dashboard?circle=${invite.circle_id}`)
      }
      router.refresh()
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Invites">
          <Bell />
          {invites.length > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-semibold text-white">
              {invites.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-2 text-sm font-medium">Circle invites</p>
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invite.circle_name}</p>
                  <p className="truncate text-xs text-muted-foreground">from {invite.invited_by_name}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="xs" variant="ghost" disabled={pending} onClick={() => respond(invite, false)}>
                    Decline
                  </Button>
                  <Button size="xs" disabled={pending} onClick={() => respond(invite, true)}>
                    Join
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
