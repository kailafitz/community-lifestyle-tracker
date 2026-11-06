"use client"

import { Plus, Users } from "lucide-react"
import { useState } from "react"
import { CreateCircleDialog } from "@/components/circles/CircleSwitcher"
import { Button } from "@/components/ui/button"

export function EmptyCircles() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <Users className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">You&apos;re not in any circles yet</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Create a circle and invite people, or accept an invite from the bell icon above.
      </p>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Create a circle
      </Button>
      <CreateCircleDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
