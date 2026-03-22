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

export type AssetVisibility = "internal" | "client_visible";

export type DocumentCategory =
  | "contracts"
  | "permits"
  | "plans"
  | "invoices"
  | "change_orders"
  | "other";

export type ActivityEventType =
  | "project_created"
  | "client_assigned"
  | "milestone_created"
  | "milestone_updated"
  | "document_uploaded"
  | "photo_uploaded"
  | "update_published";

export type NotificationKind = "message" | "update";

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

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

export interface DocumentRecord {
  id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  category: DocumentCategory;
  visibility: AssetVisibility;
  file_path: string;
  file_name: string;
  content_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
  file_url?: string | null;
}

export interface PhotoRecord {
  id: string;
  project_id: string;
  milestone_id: string | null;
  caption: string | null;
  area: string | null;
  visibility: AssetVisibility;
  file_path: string;
  file_name: string;
  content_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
  file_url?: string | null;
}

export interface ActivityRecord {
  id: string;
  project_id: string;
  event_type: ActivityEventType;
  visibility: AssetVisibility;
  title: string;
  detail: string | null;
  created_by: string;
  created_at: string;
}

export interface ProjectMessageRecord {
  id: string;
  project_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender_name?: string;
  is_read?: boolean;
}

export interface ProjectUpdateRecord {
  id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  body: string;
  visibility: AssetVisibility;
  created_by: string;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  kind: NotificationKind;
  title: string;
  detail: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ProjectInviteRecord {
  id: string;
  project_id: string;
  email: string;
  token: string;
  status: InviteStatus;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
}

export interface InviteLookupRecord {
  token: string;
  email: string;
  status: InviteStatus;
  expires_at: string | null;
  project_name: string;
  organization_slug: string;
  organization_name: string;
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

export interface ProjectWorkspace {
  project: ProjectWithMembers;
  milestones: MilestoneRecord[];
  documents: DocumentRecord[];
  photos: PhotoRecord[];
  activity: ActivityRecord[];
  messages: ProjectMessageRecord[];
  updates: ProjectUpdateRecord[];
  invites: ProjectInviteRecord[];
}
