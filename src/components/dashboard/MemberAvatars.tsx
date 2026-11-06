"use client"

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { MemberProfile } from "@/lib/types/app"
import { initials } from "@/lib/utils"

const MAX_SHOWN = 5

export function MemberAvatars({ members, size = "sm" }: { members: MemberProfile[]; size?: "sm" | "default" }) {
  const shown = members.slice(0, MAX_SHOWN)
  const extra = members.length - shown.length

  return (
    <AvatarGroup>
      {shown.map((member) => (
        <Tooltip key={member.id}>
          <TooltipTrigger asChild>
            <Avatar size={size}>
              {member.avatar_url && <AvatarImage src={member.avatar_url} alt="" />}
              <AvatarFallback>{initials(member.full_name, member.email)}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{member.full_name ?? member.email}</TooltipContent>
        </Tooltip>
      ))}
      {extra > 0 && <AvatarGroupCount className="size-6 text-xs">+{extra}</AvatarGroupCount>}
    </AvatarGroup>
  )
}
