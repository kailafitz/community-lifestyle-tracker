import { CalendarHeart } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <CalendarHeart className="size-6 text-indigo-500" />
        Circles
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}
