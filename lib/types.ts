export type UserRole = "pm" | "client";

export type ProjectStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "complete";

export type MilestoneStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "complete";

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
}

export interface ProfileRecord {
  id: string;
  full_name: string | null;
  role: UserRole;
  organization_id: string;
  organizations?: OrganizationRecord | OrganizationRecord[] | null;
}

export interface ProjectRecord {
  id: string;
  organization_id: string;
  name: string;
  location: string | null;
  status: ProjectStatus;
  start_date: string | null;
  target_end_date: string | null;
  created_by: string;
  created_at: string;
}

export interface ProjectMemberRecord {
  id: string;
  project_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface MilestoneRecord {
  id: string;
  project_id: string;
  title: string;
  status: MilestoneStatus;
  percent_complete: number;
  due_date: string | null;
  notes: string | null;
  position: number;
  created_at: string;
}

export interface ProfileWithOrganization extends ProfileRecord {
  organization: OrganizationRecord | null;
}

export interface ProjectWithMembers extends ProjectRecord {
  members: Array<{
    id: string;
    fullName: string;
    role: UserRole;
  }>;
}
