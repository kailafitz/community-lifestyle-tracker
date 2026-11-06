"use client"

import { Camera, Loader2 } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { initials } from "@/lib/utils"

const MAX_BYTES = 5 * 1024 * 1024

export function AvatarUpload({
  userId,
  name,
  value,
  onChange,
}: {
  userId: string
  name: string
  value: string | null
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image")
    if (file.size > MAX_BYTES) return toast.error("Images must be under 5 MB")

    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop() ?? "png"
    const path = `${userId}/avatar-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    })
    setUploading(false)

    if (error) return toast.error(error.message)
    onChange(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl)
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20">
        {value && <AvatarImage src={value} alt={name} />}
        <AvatarFallback className="text-xl">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
          {value ? "Change photo" : "Upload photo"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
