"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { getAppOrigin } from "@/lib/app-url";
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

  if (!["not_started", "in_progress", "blocked", "complete"].includes(status)) {
    redirect("/app/projects?error=Select%20a%20valid%20project%20status.");
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

export async function createClientInviteAction(formData: FormData) {
  const { supabase, user, profile } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const email = getString(formData, "email").toLowerCase();

  if (!projectId || !email) {
    redirect(`/app/projects/${projectId}?error=Client%20email%20is%20required.`);
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
    redirect(`/app/projects/${projectId}?error=${toQueryError(error.message)}`);
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

  redirect(`/app/projects/${projectId}?message=Client%20invite%20created.`);
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
    ensureSafeText(title, 120, "Document title");
    validateUploadFile(file, "documents");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    redirect(`/app/projects/${projectId}?error=${toQueryError(message)}`);
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
    if (caption) {
      ensureSafeText(caption, 160, "Photo caption");
    }
    if (area) {
      ensureSafeText(area, 80, "Photo area");
    }
    validateUploadFile(file, "photos");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    redirect(`/app/projects/${projectId}?error=${toQueryError(message)}`);
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

export async function sendMessageAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const projectId = getString(formData, "projectId");
  const body = getString(formData, "body");

  if (!body) {
    redirect(`/app/projects/${projectId}?error=Message%20body%20is%20required.`);
  }

  try {
    ensureSafeText(body, 2000, "Message");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send message.";
    redirect(`/app/projects/${projectId}?error=${toQueryError(message)}`);
  }

  const { error } = await supabase.from("project_messages").insert({
    project_id: projectId,
    sender_id: user.id,
    body
  });

  if (error) {
    redirect(`/app/projects/${projectId}?error=${toQueryError(error.message)}`);
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

  redirect(`/app/projects/${projectId}?message=Message%20sent.`);
}

export async function publishUpdateAction(formData: FormData) {
  const { supabase, user } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const milestoneId = getString(formData, "milestoneId");
  const title = getString(formData, "title");
  const body = getString(formData, "body");
  const visibility = getString(formData, "visibility") as AssetVisibility;

  if (!title || !body) {
    redirect(`/app/projects/${projectId}?error=Update%20title%20and%20body%20are%20required.`);
  }

  try {
    ensureSafeText(title, 120, "Update title");
    ensureSafeText(body, 4000, "Update body");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish update.";
    redirect(`/app/projects/${projectId}?error=${toQueryError(message)}`);
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
    redirect(`/app/projects/${projectId}?error=${toQueryError(error.message)}`);
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

  redirect(`/app/projects/${projectId}?message=Project%20update%20published.`);
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

  redirect(`/app/projects/${projectId}?message=Thread%20marked%20read.`);
}

export { signOutAction };
