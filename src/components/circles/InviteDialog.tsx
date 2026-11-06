"use client"

import { Loader2, UserPlus } from "lucide-react"
import { useState, useTransition } from "react"
import { inviteManyToCircle } from "@/app/actions/invites"
import { EmailListInput } from "@/components/circles/EmailListInput"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { summarizeInvites } from "@/lib/invites"

export function InviteDialog({ circleId, circleName }: { circleId: string; circleName: string }) {
  const [open, setOpen] = useState(false)
  const [emails, setEmails] = useState<string[]>([])
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const results = await inviteManyToCircle(circleId, emails)
      summarizeInvites(results)
      if (results.some((r) => r.ok)) {
        setEmails([])
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Invite">
          <UserPlus />
          <span className="hidden sm:inline">Invite</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to {circleName}</DialogTitle>
          <DialogDescription>
            New people get an email. People who already have an account see the invite when they log in.
          </DialogDescription>
        </DialogHeader>
        <EmailListInput value={emails} onChange={setEmails} />
        <DialogFooter>
          <Button onClick={submit} disabled={pending || emails.length === 0}>
            {pending && <Loader2 className="animate-spin" />}
            Send {emails.length > 1 ? `${emails.length} invites` : "invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
