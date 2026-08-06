"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { getAppOrigin } from "@/lib/app-url";
import type { FormState } from "@/lib/form-state";
import { sendEmail } from "@/lib/email";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase";
import type {
  ActivityEventType,
  AssetVisibility,
  DocumentCategory,
  MilestoneStatus,
  NotificationKind,
  ProjectStatus
} from "@/lib/types";

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png"
]);
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Success for a form that stays on the page: refresh the server data and hand
 * the confirmation back to the form, instead of navigating with `?message=`.
 */
function revalidatedSuccess(projectId: string, message: string): FormState {
  revalidatePath(`/app/projects/${projectId}`);
  return { status: "success", message };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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

async function createNotifications(params: {
  projectId: string;
  actorId: string;
  kind: NotificationKind;
  title: string;
  detail?: string;
  linkPath?: string;
  recipients: string[];
}) {
  if (params.recipients.length === 0) {
    return;
  }

  const admin = createSupabaseAdminClient();
  await admin.from("notifications").insert(
    params.recipients
      .filter((recipient) => recipient !== params.actorId)
      .map((recipient) => ({
        user_id: recipient,
        project_id: params.projectId,
        kind: params.kind,
        title: params.title,
        detail: params.detail ?? null,
        link_path: params.linkPath ?? null
      }))
  );
}

async function getProjectRecipients(projectId: string) {
  const admin = createSupabaseAdminClient();
  const { data: members } = await admin
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId);

  const userIds = (members ?? []).map((entry) => entry.user_id);

  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);

  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name ?? "Project member"
  }));
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function ensureSafeText(value: string, maxLength: number, label: string) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
}

function validateUploadFile(
  file: File,
  folder: "documents" | "photos"
) {
  if (folder === "documents") {
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new Error("Documents must be 25 MB or smaller.");
    }

    if (file.type && !ALLOWED_DOCUMENT_TYPES.has(file.type)) {
      throw new Error("Document type not supported. Use PDF, Word, text, JPG, or PNG.");
    }

    return;
  }

  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Photos must be 15 MB or smaller.");
  }

  if (file.type && !ALLOWED_PHOTO_TYPES.has(file.type)) {
    throw new Error("Photo type not supported. Use JPG, PNG, or WEBP.");
  }
}

async function sendNotificationEmails(params: {
  recipients: Array<{ id: string; email: string; full_name: string }>;
  actorId: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const recipientEmails = params.recipients
    .filter((recipient) => recipient.id !== params.actorId)
    .map((recipient) => recipient.email);

  if (recipientEmails.length === 0) {
    return;
  }

  try {
    await sendEmail({
      to: recipientEmails,
      subject: params.subject,
      text: params.text,
      html: params.html
    });
  } catch (error) {
    console.error("Email notification failed", error);
  }
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

export async function createProjectAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, user, profile } = await requirePmProfile();

  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const status = getString(formData, "status") as ProjectStatus;
  const startDate = getString(formData, "startDate");
  const targetEndDate = getString(formData, "targetEndDate");
  const clientEmail = getString(formData, "clientEmail").toLowerCase();

  const values = { name, location, status, startDate, targetEndDate, clientEmail };
  const fieldErrors: Record<string, string> = {};

  if (!name) {
    fieldErrors.name = "Give the project a name.";
  }
  if (!["not_started", "in_progress", "blocked", "complete"].includes(status)) {
    fieldErrors.status = "Select a project status.";
  }
  if (startDate && targetEndDate && startDate > targetEndDate) {
    fieldErrors.targetEndDate = "Target end date cannot be before the start date.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
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
    return {
      status: "error",
      message: projectError?.message ?? "Unable to create project.",
      values
    };
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
    } else {
      const origin = await getAppOrigin();
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("project_invites").insert({
        project_id: project.id,
        organization_id: profile.organization_id,
        email: clientEmail,
        token,
        expires_at: expiresAt,
        created_by: user.id
      });

      const inviteUrl = `${origin}/auth?invite=${token}`;
      await recordActivity({
        supabase,
        projectId: project.id,
        eventType: "client_assigned",
        title: "Client invite created",
        detail: `${clientEmail} was invited to join this project.`,
        visibility: "internal",
        createdBy: user.id
      });

      await sendNotificationEmails({
        recipients: [
          {
            id: "",
            email: clientEmail,
            full_name: clientEmail
          }
        ],
        actorId: user.id,
        subject: `Invitation to join ${name} in My Star Contractor`,
        text: `You've been invited to join the project ${name}. Create your client account here: ${inviteUrl}`,
        html: `<p>You've been invited to join <strong>${name}</strong> in My Star Contractor.</p><p><a href="${inviteUrl}">Accept your invite</a></p>`
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

export async function assignClientAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, profile, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const clientEmail = getString(formData, "clientEmail").toLowerCase();
  const values = { clientEmail };

  if (!clientEmail) {
    return {
      status: "error",
      fieldErrors: { clientEmail: "Enter the client's email address." },
      values
    };
  }

  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("role", "client")
    .eq("email", clientEmail)
    .maybeSingle<{ id: string }>();

  if (!clientProfile) {
    return {
      status: "error",
      fieldErrors: {
        clientEmail:
          "No client account in your organization uses this email. Use Invite a new client instead."
      },
      values
    };
  }

  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    user_id: clientProfile.id,
    role: "client"
  });

  if (error) {
    // A unique-violation here means they are already on the project, which is
    // a problem with the email they typed, not a server failure.
    if (/duplicate key|already exists/i.test(error.message)) {
      return {
        status: "error",
        fieldErrors: { clientEmail: "This client already has access to the project." },
        values
      };
    }

    return { status: "error", message: error.message, values };
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

  return revalidatedSuccess(projectId, `${clientEmail} now has access to this project.`);
}

export async function createClientInviteAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, user, profile } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const email = getString(formData, "email").toLowerCase();
  const values = { email };

  if (!email) {
    return {
      status: "error",
      fieldErrors: { email: "Enter the email address to invite." },
      values
    };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("project_invites").insert({
    project_id: projectId,
    organization_id: profile.organization_id,
    email,
    token,
    expires_at: expiresAt,
    created_by: user.id
  });

  if (error) {
    return { status: "error", message: error.message, values };
  }

  const origin = await getAppOrigin();
  const inviteUrl = `${origin}/auth?invite=${token}`;

  await recordActivity({
    supabase,
    projectId,
    eventType: "client_assigned",
    title: "Client invite created",
    detail: `${email} was invited to join this project.`,
    visibility: "internal",
    createdBy: user.id
  });

  await sendNotificationEmails({
    recipients: [{ id: "", email, full_name: email }],
    actorId: user.id,
    subject: "Your My Star Contractor client invite",
    text: `You were invited to join a project in My Star Contractor. Accept the invite here: ${inviteUrl}`,
    html: `<p>You were invited to join a project in My Star Contractor.</p><p><a href="${inviteUrl}">Accept your invite</a></p>`
  });

  return revalidatedSuccess(projectId, `Invite sent to ${email}.`);
}

/** Shared milestone field checks for both create and update. */
function validateMilestone(title: string, percentComplete: number) {
  const fieldErrors: Record<string, string> = {};

  if (!title) {
    fieldErrors.title = "Give the milestone a title.";
  }
  if (Number.isNaN(percentComplete) || percentComplete < 0 || percentComplete > 100) {
    fieldErrors.percentComplete = "Enter a whole number between 0 and 100.";
  }

  return fieldErrors;
}

export async function createMilestoneAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const title = getString(formData, "title");
  const dueDate = getString(formData, "dueDate");
  const status = getString(formData, "status") as MilestoneStatus;
  const percentComplete = Number(getString(formData, "percentComplete") || "0");
  const notes = getString(formData, "notes");

  const values = { title, dueDate, status, notes };
  const fieldErrors = validateMilestone(title, percentComplete);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
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
    return { status: "error", message: error.message, values };
  }

  await recordActivity({
    supabase,
    projectId,
    eventType: "milestone_created",
    title: "Milestone created",
    detail: title,
    createdBy: user.id
  });

  return revalidatedSuccess(projectId, `Milestone "${title}" created.`);
}

export async function updateMilestoneAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const milestoneId = getString(formData, "milestoneId");
  const title = getString(formData, "title");
  const dueDate = getString(formData, "dueDate");
  const status = getString(formData, "status") as MilestoneStatus;
  const percentComplete = Number(getString(formData, "percentComplete") || "0");
  const notes = getString(formData, "notes");

  const values = { title, dueDate, status, notes };
  const fieldErrors = validateMilestone(title, percentComplete);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

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
    return { status: "error", message: error.message, values };
  }

  await recordActivity({
    supabase,
    projectId,
    eventType: "milestone_updated",
    title: "Milestone updated",
    detail: title,
    createdBy: user.id
  });

  return revalidatedSuccess(projectId, "Milestone updated.");
}

export async function uploadDocumentAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const title = getString(formData, "title");
  const category = getString(formData, "category") as DocumentCategory;
  const visibility = getString(formData, "visibility") as AssetVisibility;
  const milestoneId = getString(formData, "milestoneId");
  const file = formData.get("file");

  const values = { title, category, visibility, milestoneId };
  const fieldErrors: Record<string, string> = {};

  if (!title) {
    fieldErrors.title = "Give the document a title.";
  }
  if (!(file instanceof File) || file.size === 0) {
    fieldErrors.file = "Choose a file to upload.";
  }

  // Size and type rules are field problems too: the user picks a different file.
  if (file instanceof File && file.size > 0) {
    try {
      validateUploadFile(file, "documents");
    } catch (error) {
      fieldErrors.file = errorMessage(error, "That file cannot be uploaded.");
    }
  }
  if (title) {
    try {
      ensureSafeText(title, 120, "Document title");
    } catch (error) {
      fieldErrors.title = errorMessage(error, "That title cannot be used.");
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !(file instanceof File)) {
    return { status: "error", fieldErrors, values };
  }

  let filePath: string;
  try {
    filePath = await uploadProjectFile({ file, projectId, folder: "documents" });
  } catch (error) {
    return {
      status: "error",
      message: errorMessage(error, "Upload failed. Try again."),
      values
    };
  }

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
    return { status: "error", message: error.message, values };
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

  return revalidatedSuccess(projectId, `"${title}" uploaded.`);
}

export async function uploadPhotoAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const caption = getString(formData, "caption");
  const area = getString(formData, "area");
  const visibility = getString(formData, "visibility") as AssetVisibility;
  const milestoneId = getString(formData, "milestoneId");
  const file = formData.get("file");

  const values = { caption, area, visibility, milestoneId };
  const fieldErrors: Record<string, string> = {};

  if (!(file instanceof File) || file.size === 0) {
    fieldErrors.file = "Choose an image to upload.";
  }

  if (file instanceof File && file.size > 0) {
    try {
      validateUploadFile(file, "photos");
    } catch (error) {
      fieldErrors.file = errorMessage(error, "That image cannot be uploaded.");
    }
  }
  if (caption) {
    try {
      ensureSafeText(caption, 160, "Photo caption");
    } catch (error) {
      fieldErrors.caption = errorMessage(error, "That caption cannot be used.");
    }
  }
  if (area) {
    try {
      ensureSafeText(area, 80, "Photo area");
    } catch (error) {
      fieldErrors.area = errorMessage(error, "That area cannot be used.");
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !(file instanceof File)) {
    return { status: "error", fieldErrors, values };
  }

  let filePath: string;
  try {
    filePath = await uploadProjectFile({ file, projectId, folder: "photos" });
  } catch (error) {
    return {
      status: "error",
      message: errorMessage(error, "Upload failed. Try again."),
      values
    };
  }

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
    return { status: "error", message: error.message, values };
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

  return revalidatedSuccess(projectId, "Photo uploaded.");
}

export async function sendMessageAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const projectId = getString(formData, "projectId");
  const body = getString(formData, "body");
  const values = { body };

  if (!body) {
    return {
      status: "error",
      fieldErrors: { body: "Write a message before sending." },
      values
    };
  }

  try {
    ensureSafeText(body, 2000, "Message");
  } catch (error) {
    return {
      status: "error",
      fieldErrors: { body: errorMessage(error, "That message cannot be sent.") },
      values
    };
  }

  const { error } = await supabase.from("project_messages").insert({
    project_id: projectId,
    sender_id: user.id,
    body
  });

  if (error) {
    return { status: "error", message: error.message, values };
  }

  const recipients = await getProjectRecipients(projectId);
  await createNotifications({
    projectId,
    actorId: user.id,
    kind: "message",
    title: "New project message",
    detail: body,
    linkPath: `/app/projects/${projectId}`,
    recipients: recipients.map((recipient) => recipient.id)
  });

  await sendNotificationEmails({
    recipients,
    actorId: user.id,
    subject: "New project message in My Star Contractor",
    text: `A new project message was posted:\n\n${body}`,
    html: `<p>A new project message was posted:</p><p>${body}</p>`
  });

  return revalidatedSuccess(projectId, "Message sent.");
}

export async function publishUpdateAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const milestoneId = getString(formData, "milestoneId");
  const title = getString(formData, "title");
  const body = getString(formData, "body");
  const visibility = getString(formData, "visibility") as AssetVisibility;

  const values = { title, body, visibility, milestoneId };
  const fieldErrors: Record<string, string> = {};

  if (!title) {
    fieldErrors.title = "Give the update a title.";
  } else {
    try {
      ensureSafeText(title, 120, "Update title");
    } catch (error) {
      fieldErrors.title = errorMessage(error, "That title cannot be used.");
    }
  }

  if (!body) {
    fieldErrors.body = "Write the update body.";
  } else {
    try {
      ensureSafeText(body, 4000, "Update body");
    } catch (error) {
      fieldErrors.body = errorMessage(error, "That body cannot be used.");
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  const { error } = await supabase.from("project_updates").insert({
    project_id: projectId,
    milestone_id: milestoneId || null,
    title,
    body,
    visibility,
    created_by: user.id
  });

  if (error) {
    return { status: "error", message: error.message, values };
  }

  await recordActivity({
    supabase,
    projectId,
    eventType: "update_published",
    title: `Update published: ${title}`,
    detail: body,
    visibility,
    createdBy: user.id
  });

  if (visibility === "client_visible") {
    const recipients = await getProjectRecipients(projectId);
    await createNotifications({
      projectId,
      actorId: user.id,
      kind: "update",
      title,
      detail: body,
      linkPath: `/app/projects/${projectId}`,
      recipients: recipients.map((recipient) => recipient.id)
    });

    await sendNotificationEmails({
      recipients,
      actorId: user.id,
      subject: `Project update: ${title}`,
      text: body,
      html: `<p>${body}</p>`
    });
  }

  return revalidatedSuccess(
    projectId,
    visibility === "client_visible"
      ? "Update published. The client has been notified."
      : "Internal note saved. The client cannot see it."
  );
}

export async function markNotificationsReadAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  redirect("/app");
}

export async function markProjectMessagesReadAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const projectId = getString(formData, "projectId");

  const { data: unreadMessages } = await supabase
    .from("project_messages")
    .select("id, sender_id")
    .eq("project_id", projectId)
    .neq("sender_id", user.id);

  const messageIds = (unreadMessages ?? []).map((message) => message.id);

  if (messageIds.length > 0) {
    const { data: existingReads } = await supabase
      .from("project_message_reads")
      .select("message_id")
      .eq("user_id", user.id)
      .in("message_id", messageIds);

    const alreadyRead = new Set((existingReads ?? []).map((row) => row.message_id));
    const rows = messageIds
      .filter((messageId) => !alreadyRead.has(messageId))
      .map((messageId) => ({
        message_id: messageId,
        user_id: user.id
      }));

    if (rows.length > 0) {
      await supabase.from("project_message_reads").insert(rows);
    }
  }

  // The thread itself flips to "Read", which is the confirmation. No banner
  // and no query parameter left behind in the URL.
  revalidatePath(`/app/projects/${projectId}`);
}

export { signOutAction };
