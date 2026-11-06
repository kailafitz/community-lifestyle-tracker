import {
  Activity,
  Bike,
  BookOpen,
  Briefcase,
  Brush,
  Coffee,
  Dumbbell,
  Footprints,
  Gamepad2,
  GraduationCap,
  Heart,
  Laptop,
  Leaf,
  Moon,
  Music,
  PartyPopper,
  Phone,
  ShoppingCart,
  Sparkles,
  Sun,
  Tv,
  Users,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react"

export const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  dumbbell: Dumbbell,
  footprints: Footprints,
  bike: Bike,
  waves: Waves,
  heart: Heart,
  leaf: Leaf,
  moon: Moon,
  sun: Sun,
  coffee: Coffee,
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  briefcase: Briefcase,
  laptop: Laptop,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  brush: Brush,
  music: Music,
  "gamepad-2": Gamepad2,
  tv: Tv,
  phone: Phone,
  users: Users,
  "party-popper": PartyPopper,
  sparkles: Sparkles,
}

export const ICON_NAMES = Object.keys(ACTIVITY_ICONS)

export function getActivityIcon(name: string | null | undefined): LucideIcon {
  return (name && ACTIVITY_ICONS[name]) || Activity
}

export const ACTIVITY_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
]

export const DEFAULT_COLOR = "#6366f1"
export const DEFAULT_ICON = "activity"
