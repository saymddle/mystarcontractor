import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase";
import type {
  ActivityRecord,
  AssetVisibility,
  DocumentRecord,
  InviteLookupRecord,
  MilestoneRecord,
  NotificationRecord,
  PhotoRecord,
  ProfileWithOrganization,
  ProjectInviteRecord,
  ProjectMessageRecord,
  ProjectMemberRecord,
  ProjectRecord,
  ProjectUpdateRecord,
  ProjectWithMembers,
  ProjectWorkspace,
  WorkspaceSection
} from "@/lib/types";
import { visibilityFilterFor } from "@/lib/visibility";

async function getClientProjects(profile: ProfileWithOrganization) {
  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", profile.id);

  const projectIds = memberships?.map((entry) => entry.project_id) ?? [];

  if (projectIds.length === 0) {
    return [];
  }

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, organization_id, name, location, status, start_date, target_end_date, created_by, created_at"
    )
    .in("id", projectIds)
    .order("created_at", { ascending: false });

  return (projects ?? []) as ProjectRecord[];
}

export async function getProjectsForProfile(profile: ProfileWithOrganization) {
  if (profile.role === "pm") {
    const supabase = await createSupabaseServerClient();
    const { data: projects } = await supabase
      .from("projects")
      .select(
        "id, organization_id, name, location, status, start_date, target_end_date, created_by, created_at"
      )
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false });

    return (projects ?? []) as ProjectRecord[];
  }

  return getClientProjects(profile);
}

export async function getProjectByIdForProfile(
  projectId: string,
  profile: ProfileWithOrganization
) {
  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, organization_id, name, location, status, start_date, target_end_date, created_by, created_at"
    )
    .eq("id", projectId)
    .single<ProjectRecord>();

  if (!project) {
    return null;
  }

  if (
    profile.role === "client" &&
    project.organization_id !== profile.organization_id
  ) {
    return null;
  }

  const { data: memberships } = await supabase
    .from("project_members")
    .select("id, project_id, user_id, role, created_at")
    .eq("project_id", projectId);

  const memberRows = (memberships ?? []) as ProjectMemberRecord[];
  const memberIds = memberRows.map((member) => member.user_id);

  let memberDirectory = new Map<string, string>();

  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", memberIds);

    memberDirectory = new Map(
      (profiles ?? []).map((entry) => [
        entry.id,
        entry.full_name ?? "Unnamed user"
      ])
    );
  }

  const { data: milestones } = await supabase
    .from("milestones")
    .select(
      "id, project_id, title, status, percent_complete, due_date, notes, position, created_at"
    )
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  return {
    project: {
      ...project,
      members: memberRows.map((member) => ({
        id: member.user_id,
        fullName: memberDirectory.get(member.user_id) ?? "Unnamed user",
        role: member.role
      }))
    } satisfies ProjectWithMembers,
    milestones: (milestones ?? []) as MilestoneRecord[]
  };
}

async function attachSignedUrls<T extends { file_path: string }>(
  rows: T[]
): Promise<Array<T & { file_url: string | null }>> {
  if (rows.length === 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const signed = await Promise.all(
    rows.map(async (row) => {
      const { data } = await admin.storage
        .from("project-assets")
        .createSignedUrl(row.file_path, 60 * 60);

      return {
        ...row,
        file_url: data?.signedUrl ?? null
      };
    })
  );

  return signed;
}

/**
 * How many rows each workspace section loads by default, and how many when the
 * user asks to expand one. Documents and photos previously loaded every row for
 * the project, which does not survive a job with several hundred photos.
 */
const SECTION_LIMITS: Record<WorkspaceSection, number> = {
  documents: 24,
  photos: 24,
  activity: 20,
  messages: 50,
  updates: 20
};

const EXPANDED_LIMIT = 500;

function limitFor(section: WorkspaceSection, expand?: WorkspaceSection) {
  return expand === section ? EXPANDED_LIMIT : SECTION_LIMITS[section];
}

export async function getProjectWorkspaceForProfile(
  projectId: string,
  profile: ProfileWithOrganization,
  filters: {
    query?: string;
    visibility?: AssetVisibility | "all";
    documentCategory?: string;
    expand?: WorkspaceSection;
  }
): Promise<ProjectWorkspace | null> {
  const base = await getProjectByIdForProfile(projectId, profile);

  if (!base) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  let documentQuery = supabase
    .from("documents")
    .select(
      "id, project_id, milestone_id, title, category, visibility, file_path, file_name, content_type, file_size, uploaded_by, uploaded_at",
      { count: "exact" }
    )
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false })
    .limit(limitFor("documents", filters.expand));

  let photoQuery = supabase
    .from("photos")
    .select(
      "id, project_id, milestone_id, caption, area, visibility, file_path, file_name, content_type, file_size, uploaded_by, uploaded_at",
      { count: "exact" }
    )
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false })
    .limit(limitFor("photos", filters.expand));

  let activityQuery = supabase
    .from("activity_events")
    .select(
      "id, project_id, event_type, visibility, title, detail, created_by, created_at",
      { count: "exact" }
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limitFor("activity", filters.expand));

  const q = filters.query?.trim();

  if (q) {
    documentQuery = documentQuery.ilike("title", `%${q}%`);
    photoQuery = photoQuery.or(`caption.ilike.%${q}%,area.ilike.%${q}%`);
    activityQuery = activityQuery.or(`title.ilike.%${q}%,detail.ilike.%${q}%`);
  }

  // Defence in depth. RLS is the control that protects this data; constraining
  // the query too means a policy regression alone cannot leak internal assets.
  const visibility = visibilityFilterFor(profile.role, filters.visibility);

  if (visibility) {
    documentQuery = documentQuery.eq("visibility", visibility);
    photoQuery = photoQuery.eq("visibility", visibility);
    activityQuery = activityQuery.eq("visibility", visibility);
  }

  if (filters.documentCategory && filters.documentCategory !== "all") {
    documentQuery = documentQuery.eq("category", filters.documentCategory);
  }

  const [
    { data: documents, count: documentCount },
    { data: photos, count: photoCount },
    { data: activity, count: activityCount }
  ] = await Promise.all([documentQuery, photoQuery, activityQuery]);

  // Newest first, then reversed for chronological display. Ordering ascending
  // and taking 50 returned the 50 OLDEST rows, so once a thread passed 50
  // messages every new one fell outside the window and never rendered.
  const { data: messagesDesc, count: messageCount } = await supabase
    .from("project_messages")
    .select("id, project_id, sender_id, body, created_at", { count: "exact" })
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limitFor("messages", filters.expand));

  const messages = (messagesDesc ?? []).slice().reverse();

  const { data: updates, count: updateCount } = await supabase
    .from("project_updates")
    .select(
      "id, project_id, milestone_id, title, body, visibility, created_by, created_at",
      { count: "exact" }
    )
    .eq("project_id", projectId)
    .match(visibility ? { visibility } : {})
    .order("created_at", { ascending: false })
    .limit(limitFor("updates", filters.expand));

  const { data: invites } =
    profile.role === "pm"
      ? await supabase
          .from("project_invites")
          .select("id, project_id, email, token, status, created_at, expires_at, accepted_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
      : { data: [] };

  const messageIds = messages.map((message) => message.id);
  let readSet = new Set<string>();

  if (messageIds.length > 0) {
    const { data: reads } = await supabase
      .from("project_message_reads")
      .select("message_id")
      .eq("user_id", profile.id)
      .in("message_id", messageIds);

    readSet = new Set((reads ?? []).map((entry) => entry.message_id));
  }

  const senderIds = [...new Set(messages.map((message) => message.sender_id))];
  let senderDirectory = new Map<string, string>();

  if (senderIds.length > 0) {
    const { data: senders } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", senderIds);

    senderDirectory = new Map(
      (senders ?? []).map((entry) => [entry.id, entry.full_name ?? "Unnamed user"])
    );
  }

  return {
    ...base,
    documents: await attachSignedUrls((documents ?? []) as DocumentRecord[]),
    photos: await attachSignedUrls((photos ?? []) as PhotoRecord[]),
    activity: (activity ?? []) as ActivityRecord[],
    messages: (messages as ProjectMessageRecord[]).map((message) => ({
      ...message,
      sender_name: senderDirectory.get(message.sender_id) ?? "Unnamed user",
      is_read: message.sender_id === profile.id ? true : readSet.has(message.id)
    })),
    updates: (updates ?? []) as ProjectUpdateRecord[],
    invites: (invites ?? []) as ProjectInviteRecord[],
    counts: {
      documents: documentCount ?? 0,
      photos: photoCount ?? 0,
      activity: activityCount ?? 0,
      messages: messageCount ?? 0,
      updates: updateCount ?? 0
    }
  };
}

export async function getNotificationsForProfile(profileId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, user_id, project_id, kind, title, detail, link_path, read_at, created_at")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false })
    .limit(8);

  return (data ?? []) as NotificationRecord[];
}

export async function getInviteByToken(token: string) {
  if (!token) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("project_invites")
    .select(
      "token, email, status, expires_at, projects(name, organizations(name, slug))"
    )
    .eq("token", token)
    .maybeSingle<{
      token: string;
      email: string;
      status: InviteLookupRecord["status"];
      expires_at: string | null;
      projects:
        | {
            name: string;
            organizations:
              | {
                  name: string;
                  slug: string;
                }
              | {
                  name: string;
                  slug: string;
                }[];
          }
        | null;
    }>();

  if (!data?.projects) {
    return null;
  }

  const organization = Array.isArray(data.projects.organizations)
    ? data.projects.organizations[0]
    : data.projects.organizations;

  if (!organization) {
    return null;
  }

  return {
    token: data.token,
    email: data.email,
    status: data.status,
    expires_at: data.expires_at,
    project_name: data.projects.name,
    organization_slug: organization.slug,
    organization_name: organization.name
  } satisfies InviteLookupRecord;
}

export async function getOnboardingSummary(profile: ProfileWithOrganization) {
  const projects = await getProjectsForProfile(profile);

  const supabase = await createSupabaseServerClient();
  const [{ count: clientCount }, { count: pendingInviteCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .eq("role", "client"),
    supabase
      .from("project_invites")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .eq("status", "pending")
  ]);

  return {
    projectCount: projects.length,
    clientCount: clientCount ?? 0,
    pendingInviteCount: pendingInviteCount ?? 0
  };
}

export function getProgressSummary(milestones: MilestoneRecord[]) {
  if (milestones.length === 0) {
    return 0;
  }

  const total = milestones.reduce(
    (sum, milestone) => sum + milestone.percent_complete,
    0
  );

  return Math.round(total / milestones.length);
}
