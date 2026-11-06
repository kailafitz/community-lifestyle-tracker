"use client"

import { Loader2, LogOut, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { signOut } from "@/app/actions/auth"
import { saveProfile } from "@/app/actions/profile"
import { AvatarUpload } from "@/components/profile/AvatarUpload"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Profile } from "@/lib/types/app"
import { initials } from "@/lib/utils"

export function UserMenu({ profile }: { profile: Profile }) {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar>
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
              <AvatarFallback>{initials(profile.full_name, profile.email)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate">{profile.full_name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{profile.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <UserRound /> Edit profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => signOut()}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProfileDialog profile={profile} open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  )
}

function ProfileDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: Profile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [name, setName] = useState(profile.full_name ?? "")
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await saveProfile({ fullName: name, avatarUrl })
      if (!result.ok) return void toast.error(result.error)
      toast.success("Profile updated")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <AvatarUpload userId={profile.id} name={name} value={avatarUrl} onChange={setAvatarUrl} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Full name</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
