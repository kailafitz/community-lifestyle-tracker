"use client"

import { X } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailListInput({
  value,
  onChange,
  placeholder = "friend@example.com",
}: {
  value: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)

  function commit(raw: string) {
    const candidates = raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    if (!candidates.length) return true

    const invalid = candidates.find((e) => !EMAIL_RE.test(e))
    if (invalid) {
      setError(`"${invalid}" isn't a valid email`)
      return false
    }
    onChange([...new Set([...value, ...candidates])])
    setDraft("")
    setError(null)
    return true
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === " ") {
            e.preventDefault()
            commit(draft)
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => commit(draft)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1 pr-1">
              {email}
              <button
                type="button"
                aria-label={`Remove ${email}`}
                onClick={() => onChange(value.filter((e) => e !== email))}
                className="rounded-sm opacity-60 hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
