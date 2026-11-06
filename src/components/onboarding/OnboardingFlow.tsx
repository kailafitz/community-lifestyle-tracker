"use client"

import { ArrowLeft, Check, Loader2, Mail, Plus, Users } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createCircle } from "@/app/actions/circles"
import { respondToInvite } from "@/app/actions/invites"
import { completeOnboarding, saveProfile } from "@/app/actions/profile"
import { EmailListInput } from "@/components/circles/EmailListInput"
import { AvatarUpload } from "@/components/profile/AvatarUpload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { summarizeInvites } from "@/lib/invites"
import type { PendingInvite } from "@/lib/types/app"
import { cn } from "@/lib/utils"

type Props = {
  userId: string
  email: string
  needsPassword: boolean
  initialName: string
  initialAvatarUrl: string | null
  invites: PendingInvite[]
  existingCircles: { id: string; name: string }[]
}

const STEPS = ["About you", "Your photo", "Your circle"]

export function OnboardingFlow(props: Props) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(props.initialName)
  const [password, setPassword] = useState("")
  const [avatarUrl, setAvatarUrl] = useState(props.initialAvatarUrl)
  const [pending, startTransition] = useTransition()

  function saveAndContinue() {
    startTransition(async () => {
      const result = await saveProfile({
        fullName: name,
        avatarUrl,
        password: props.needsPassword ? password : undefined,
      })
      if (!result.ok) return void toast.error(result.error)
      setStep(2)
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex gap-1.5">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={cn("h-1.5 flex-1 rounded-full bg-muted", i <= step && "bg-indigo-500")}
            />
          ))}
        </div>
        <CardDescription>
          Step {step + 1} of {STEPS.length} &middot; {STEPS[step]}
        </CardDescription>
        <CardTitle className="text-xl">
          {step === 0 && "What should we call you?"}
          {step === 1 && "Add a profile picture"}
          {step === 2 && "Set up your circle"}
        </CardTitle>
      </CardHeader>

      {step === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return toast.error("Tell us your name")
            if (props.needsPassword && password.length < 6) {
              return toast.error("Password must be at least 6 characters")
            }
            setStep(1)
          }}
        >
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
            </div>
            {props.needsPassword && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Choose a password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  You were invited as {props.email}. Set a password so you can log in later.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="mt-6 justify-end">
            <Button type="submit">Continue</Button>
          </CardFooter>
        </form>
      )}

      {step === 1 && (
        <>
          <CardContent>
            <AvatarUpload userId={props.userId} name={name} value={avatarUrl} onChange={setAvatarUrl} />
          </CardContent>
          <CardFooter className="mt-6 justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft /> Back
            </Button>
            <Button onClick={saveAndContinue} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {avatarUrl ? "Continue" : "Skip for now"}
            </Button>
          </CardFooter>
        </>
      )}

      {step === 2 && (
        <CircleStep
          invites={props.invites}
          existingCircles={props.existingCircles}
          onBack={() => setStep(1)}
        />
      )}
    </Card>
  )
}

function CircleStep({
  invites,
  existingCircles,
  onBack,
}: {
  invites: PendingInvite[]
  existingCircles: { id: string; name: string }[]
  onBack: () => void
}) {
  const [mode, setMode] = useState<"create" | "join">(invites.length ? "join" : "create")
  const [circleName, setCircleName] = useState("")
  const [emails, setEmails] = useState<string[]>([])
  const [joined, setJoined] = useState<string[]>(existingCircles.map((c) => c.id))
  const [handled, setHandled] = useState<Record<string, "accepted" | "declined">>({})
  const [pending, startTransition] = useTransition()

  function finish(circleId: string) {
    startTransition(async () => {
      const result = await completeOnboarding(circleId)
      if (result && !result.ok) toast.error(result.error)
    })
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createCircle(circleName, emails)
      if (!result.ok) return void toast.error(result.error)
      summarizeInvites(result.invites)
      const done = await completeOnboarding(result.circleId)
      if (done && !done.ok) toast.error(done.error)
    })
  }

  function handleInvite(inviteId: string, accept: boolean) {
    startTransition(async () => {
      const result = await respondToInvite(inviteId, accept)
      if (!result.ok) return void toast.error(result.error)
      setHandled((h) => ({ ...h, [inviteId]: accept ? "accepted" : "declined" }))
      if (accept && result.circleId) setJoined((j) => [...j, result.circleId])
    })
  }

  return (
    <>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {(["create", "join"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium text-muted-foreground transition",
                mode === m && "bg-background text-foreground shadow-sm"
              )}
            >
              {m === "create" ? <Plus className="size-4" /> : <Users className="size-4" />}
              {m === "create" ? "Create a circle" : `Join (${invites.length})`}
            </button>
          ))}
        </div>

        {mode === "create" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="circle-name">Circle name</Label>
              <Input
                id="circle-name"
                placeholder="e.g. Sunday Runners"
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Invite people by email</Label>
              <EmailListInput value={emails} onChange={setEmails} />
              <p className="text-xs text-muted-foreground">
                New people get an email invite. People who already have an account will see it when they log in.
              </p>
            </div>
          </div>
        ) : invites.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <Mail className="size-6" />
            No invites yet. Ask a friend to invite your email address, or create your own circle.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{invite.circle_name}</p>
                  <p className="truncate text-xs text-muted-foreground">Invited by {invite.invited_by_name}</p>
                </div>
                {handled[invite.id] ? (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    {handled[invite.id] === "accepted" && <Check className="size-4 text-emerald-500" />}
                    {handled[invite.id] === "accepted" ? "Joined" : "Declined"}
                  </span>
                ) : (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => handleInvite(invite.id, false)}>
                      Decline
                    </Button>
                    <Button size="sm" disabled={pending} onClick={() => handleInvite(invite.id, true)}>
                      Accept
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="mt-6 justify-between">
        <Button variant="ghost" onClick={onBack} disabled={pending}>
          <ArrowLeft /> Back
        </Button>
        {mode === "create" ? (
          <Button onClick={handleCreate} disabled={pending || !circleName.trim()}>
            {pending && <Loader2 className="animate-spin" />}
            Create circle
          </Button>
        ) : (
          <Button onClick={() => finish(joined[0])} disabled={pending || joined.length === 0}>
            {pending && <Loader2 className="animate-spin" />}
            Go to dashboard
          </Button>
        )}
      </CardFooter>
    </>
  )
}
