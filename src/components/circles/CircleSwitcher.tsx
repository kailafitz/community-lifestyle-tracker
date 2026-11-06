"use client"

import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createCircle } from "@/app/actions/circles"
import { EmailListInput } from "@/components/circles/EmailListInput"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { summarizeInvites } from "@/lib/invites"

type CircleOption = { id: string; name: string }

export function CircleSwitcher({ circles, currentId }: { circles: CircleOption[]; currentId: string | null }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const current = circles.find((c) => c.id === currentId)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="max-w-56 gap-2 font-semibold">
            <span className="truncate">{current?.name ?? "Select a circle"}</span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Your circles</DropdownMenuLabel>
          {circles.map((circle) => (
            <DropdownMenuItem key={circle.id} onSelect={() => router.push(`/dashboard?circle=${circle.id}`)}>
              <span className="truncate">{circle.name}</span>
              {circle.id === currentId && <Check className="ml-auto" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus /> New circle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateCircleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

export function CreateCircleDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [emails, setEmails] = useState<string[]>([])
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const result = await createCircle(name, emails)
      if (!result.ok) return void toast.error(result.error)
      summarizeInvites(result.invites)
      setName("")
      setEmails([])
      onOpenChange(false)
      router.push(`/dashboard?circle=${result.circleId}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a circle</DialogTitle>
          <DialogDescription>A circle shares one calendar between its members.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-circle-name">Name</Label>
            <Input id="new-circle-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Invite by email (optional)</Label>
            <EmailListInput value={emails} onChange={setEmails} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            {pending && <Loader2 className="animate-spin" />}
            Create circle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
