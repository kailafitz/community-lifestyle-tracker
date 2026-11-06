import type { Database } from "./database"

type PublicTables = Database["public"]["Tables"]

export type Row<T extends keyof PublicTables> = PublicTables[T]["Row"]

export type Profile = Row<"profiles">
export type Circle = Row<"circles">
export type Activity = Row<"activities">
export type ActivityLog = Row<"activity_logs">

export type PendingInvite =
  Database["public"]["Functions"]["get_my_pending_invites"]["Returns"][number]

export type MemberProfile = Pick<Profile, "id" | "full_name" | "avatar_url" | "email">

export type CalendarLog = ActivityLog & {
  activity: Pick<Activity, "id" | "name" | "color" | "icon">
}
