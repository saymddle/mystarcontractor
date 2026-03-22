"use server";

import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase";
import type {
  ActivityEventType,
  AssetVisibility,
  DocumentCategory,
  MilestoneStatus,
  ProjectStatus
} from "@/lib/types";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toQueryError(message: string) {
  return encodeURIComponent(message);
}

async function requirePmProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", user.id)
    .single<{ id: string; role: string; organization_id: string }>();

  if (!profile || profile.role !== "pm") {
    redirect("/app?error=Only%20project%20managers%20can%20perform%20that%20action.");
  }

  return { supabase, user, profile };
}

async function recordActivity(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  projectId: string;
  eventType: ActivityEventType;
  title: string;
  detail?: string;
  visibility?: AssetVisibility;
  createdBy: string;
}) {
  await params.supabase.from("activity_events").insert({
    project_id: params.projectId,
    event_type: params.eventType,
    visibility: params.visibility ?? "internal",
    title: params.title,
    detail: params.detail ?? null,
    created_by: params.createdBy
  });
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

async function uploadProjectFile(params: {
  file: File;
  projectId: string;
  folder: "documents" | "photos";
}) {
  const admin = createSupabaseAdminClient();
  const extension = params.file.name.includes(".")
    ? params.file.name.split(".").pop()
    : "bin";
  const safeName = sanitizeFileName(params.file.name.replace(/\.[^/.]+$/, ""));
  const filePath = `${params.projectId}/${params.folder}/${Date.now()}-${safeName}.${extension}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());

  const { error } = await admin.storage
    .from("project-assets")
    .upload(filePath, buffer, {
      contentType: params.file.type || "application/octet-stream",
      upsert: false
    });

  if (error) {
    throw new Error(error.message);
  }

  return filePath;
}

export async function createProjectAction(formData: FormData) {
  const { supabase, user, profile } = await requirePmProfile();

  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const status = getString(formData, "status") as ProjectStatus;
  const startDate = getString(formData, "startDate");
  const targetEndDate = getString(formData, "targetEndDate");
  const clientEmail = getString(formData, "clientEmail").toLowerCase();

  if (!name) {
    redirect("/app/projects?error=Project%20name%20is%20required.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      organization_id: profile.organization_id,
      name,
      location: location || null,
      status,
      start_date: startDate || null,
      target_end_date: targetEndDate || null,
      created_by: user.id
    })
    .select("id")
    .single<{ id: string }>();

  if (projectError || !project) {
    redirect(
      `/app/projects?error=${toQueryError(
        projectError?.message ?? "Unable to create project."
      )}`
    );
  }

  await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "pm"
  });

  if (clientEmail) {
    const { data: invitedUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "client")
      .eq("organization_id", profile.organization_id)
      .eq("email", clientEmail)
      .maybeSingle<{ id: string }>();

    if (invitedUser) {
      await supabase.from("project_members").insert({
        project_id: project.id,
        user_id: invitedUser.id,
        role: "client"
      });

      await recordActivity({
        supabase,
        projectId: project.id,
        eventType: "client_assigned",
        title: "Client assigned to project",
        detail: `${clientEmail} was added to this project.`,
        visibility: "client_visible",
        createdBy: user.id
      });
    }
  }

  await recordActivity({
    supabase,
    projectId: project.id,
    eventType: "project_created",
    title: "Project created",
    detail: `${name} was created.`,
    visibility: "internal",
    createdBy: user.id
  });

  redirect(`/app/projects/${project.id}`);
}

export async function assignClientAction(formData: FormData) {
  const { supabase, profile, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const clientEmail = getString(formData, "clientEmail").toLowerCase();

  if (!projectId || !clientEmail) {
    redirect(`/app/projects/${projectId}?error=Client%20email%20is%20required.`);
  }

  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("role", "client")
    .eq("email", clientEmail)
    .maybeSingle<{ id: string }>();

  if (!clientProfile) {
    redirect(
      `/app/projects/${projectId}?error=Client%20account%20not%20found%20in%20this%20organization.`
    );
  }

  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    user_id: clientProfile.id,
    role: "client"
  });

  if (error) {
    redirect(
      `/app/projects/${projectId}?error=${toQueryError(error.message)}`
    );
  }

  await recordActivity({
    supabase,
    projectId,
    eventType: "client_assigned",
    title: "Client assigned to project",
    detail: `${clientEmail} was added to this project.`,
    visibility: "client_visible",
    createdBy: user.id
  });

  redirect(`/app/projects/${projectId}?message=Client%20assigned%20successfully.`);
}

export async function createMilestoneAction(formData: FormData) {
  const { supabase, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const title = getString(formData, "title");
  const dueDate = getString(formData, "dueDate");
  const status = getString(formData, "status") as MilestoneStatus;
  const percentComplete = Number(getString(formData, "percentComplete") || "0");
  const notes = getString(formData, "notes");

  if (!projectId || !title) {
    redirect(`/app/projects/${projectId}?error=Milestone%20title%20is%20required.`);
  }

  const { data: lastMilestone } = await supabase
    .from("milestones")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const position = (lastMilestone?.position ?? -1) + 1;

  const { error } = await supabase.from("milestones").insert({
    project_id: projectId,
    title,
    due_date: dueDate || null,
    status,
    percent_complete: percentComplete,
    notes: notes || null,
    position
  });

  if (error) {
    redirect(`/app/projects/${projectId}?error=${toQueryError(error.message)}`);
  }

  await recordActivity({
    supabase,
    projectId,
    eventType: "milestone_created",
    title: "Milestone created",
    detail: title,
    createdBy: user.id
  });

  redirect(`/app/projects/${projectId}?message=Milestone%20created.`);
}

export async function updateMilestoneAction(formData: FormData) {
  const { supabase, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const milestoneId = getString(formData, "milestoneId");
  const title = getString(formData, "title");
  const dueDate = getString(formData, "dueDate");
  const status = getString(formData, "status") as MilestoneStatus;
  const percentComplete = Number(getString(formData, "percentComplete") || "0");
  const notes = getString(formData, "notes");

  const { error } = await supabase
    .from("milestones")
    .update({
      title,
      due_date: dueDate || null,
      status,
      percent_complete: percentComplete,
      notes: notes || null
    })
    .eq("id", milestoneId)
    .eq("project_id", projectId);

  if (error) {
    redirect(`/app/projects/${projectId}?error=${toQueryError(error.message)}`);
  }

  await recordActivity({
    supabase,
    projectId,
    eventType: "milestone_updated",
    title: "Milestone updated",
    detail: title,
    createdBy: user.id
  });

  redirect(`/app/projects/${projectId}?message=Milestone%20updated.`);
}

export async function uploadDocumentAction(formData: FormData) {
  const { supabase, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const title = getString(formData, "title");
  const category = getString(formData, "category") as DocumentCategory;
  const visibility = getString(formData, "visibility") as AssetVisibility;
  const milestoneId = getString(formData, "milestoneId");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/app/projects/${projectId}?error=Select%20a%20document%20file.`);
  }

  if (!title) {
    redirect(`/app/projects/${projectId}?error=Document%20title%20is%20required.`);
  }

  try {
    const filePath = await uploadProjectFile({
      file,
      projectId,
      folder: "documents"
    });

    const { error } = await supabase.from("documents").insert({
      project_id: projectId,
      milestone_id: milestoneId || null,
      title,
      category,
      visibility,
      file_path: filePath,
      file_name: file.name,
      content_type: file.type || null,
      file_size: file.size,
      uploaded_by: user.id
    });

    if (error) {
      redirect(`/app/projects/${projectId}?error=${toQueryError(error.message)}`);
    }

    await recordActivity({
      supabase,
      projectId,
      eventType: "document_uploaded",
      title: "Document uploaded",
      detail: title,
      visibility,
      createdBy: user.id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    redirect(`/app/projects/${projectId}?error=${toQueryError(message)}`);
  }

  redirect(`/app/projects/${projectId}?message=Document%20uploaded.`);
}

export async function uploadPhotoAction(formData: FormData) {
  const { supabase, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const caption = getString(formData, "caption");
  const area = getString(formData, "area");
  const visibility = getString(formData, "visibility") as AssetVisibility;
  const milestoneId = getString(formData, "milestoneId");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/app/projects/${projectId}?error=Select%20a%20photo%20file.`);
  }

  try {
    const filePath = await uploadProjectFile({
      file,
      projectId,
      folder: "photos"
    });

    const { error } = await supabase.from("photos").insert({
      project_id: projectId,
      milestone_id: milestoneId || null,
      caption: caption || null,
      area: area || null,
      visibility,
      file_path: filePath,
      file_name: file.name,
      content_type: file.type || null,
      file_size: file.size,
      uploaded_by: user.id
    });

    if (error) {
      redirect(`/app/projects/${projectId}?error=${toQueryError(error.message)}`);
    }

    await recordActivity({
      supabase,
      projectId,
      eventType: "photo_uploaded",
      title: "Photo uploaded",
      detail: caption || area || file.name,
      visibility,
      createdBy: user.id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    redirect(`/app/projects/${projectId}?error=${toQueryError(message)}`);
  }

  redirect(`/app/projects/${projectId}?message=Photo%20uploaded.`);
}

export { signOutAction };
