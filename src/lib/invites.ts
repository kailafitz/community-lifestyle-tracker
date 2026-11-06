import { toast } from "sonner"
import type { InviteResult } from "@/app/actions/invites"

export function summarizeInvites(results: InviteResult[]) {
  const emailed = results.filter((r) => r.ok && r.delivery === "email").length
  const inApp = results.filter((r) => r.ok && r.delivery === "in_app").length
  const failed = results.filter((r): r is Extract<InviteResult, { ok: false }> => !r.ok)

  const parts = [
    emailed && `${emailed} emailed`,
    inApp && `${inApp} will see it in the app`,
  ].filter(Boolean)
  if (parts.length) toast.success(`Invites sent: ${parts.join(", ")}`)

  failed.forEach((f) => toast.error(`${f.email}: ${f.error}`))
}
