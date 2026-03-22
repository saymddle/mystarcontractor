import { createSupabaseServerClient } from "@/lib/supabase";
import type {
  MilestoneRecord,
  ProfileWithOrganization,
  ProjectMemberRecord,
  ProjectRecord,
  ProjectWithMembers
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
