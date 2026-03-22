import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase";
import type {
  ActivityRecord,
  AssetVisibility,
  DocumentRecord,
  MilestoneRecord,
  PhotoRecord,
  ProfileWithOrganization,
  ProjectMemberRecord,
  ProjectRecord,
  ProjectWithMembers,
  ProjectWorkspace
} from "@/lib/types";

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

export async function getProjectWorkspaceForProfile(
  projectId: string,
  profile: ProfileWithOrganization,
  filters: {
    query?: string;
    visibility?: AssetVisibility | "all";
    documentCategory?: string;
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
      "id, project_id, milestone_id, title, category, visibility, file_path, file_name, content_type, file_size, uploaded_by, uploaded_at"
    )
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false });

  let photoQuery = supabase
    .from("photos")
    .select(
      "id, project_id, milestone_id, caption, area, visibility, file_path, file_name, content_type, file_size, uploaded_by, uploaded_at"
    )
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false });

  let activityQuery = supabase
    .from("activity_events")
    .select(
      "id, project_id, event_type, visibility, title, detail, created_by, created_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);

  const q = filters.query?.trim();

  if (q) {
    documentQuery = documentQuery.ilike("title", `%${q}%`);
    photoQuery = photoQuery.or(`caption.ilike.%${q}%,area.ilike.%${q}%`);
    activityQuery = activityQuery.or(`title.ilike.%${q}%,detail.ilike.%${q}%`);
  }

  if (filters.visibility && filters.visibility !== "all") {
    documentQuery = documentQuery.eq("visibility", filters.visibility);
    photoQuery = photoQuery.eq("visibility", filters.visibility);
    activityQuery = activityQuery.eq("visibility", filters.visibility);
  }

  if (filters.documentCategory && filters.documentCategory !== "all") {
    documentQuery = documentQuery.eq("category", filters.documentCategory);
  }

  const [{ data: documents }, { data: photos }, { data: activity }] =
    await Promise.all([documentQuery, photoQuery, activityQuery]);

  return {
    ...base,
    documents: await attachSignedUrls((documents ?? []) as DocumentRecord[]),
    photos: await attachSignedUrls((photos ?? []) as PhotoRecord[]),
    activity: (activity ?? []) as ActivityRecord[]
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
