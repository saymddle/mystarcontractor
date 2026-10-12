/**
 * Pure validation rules shared by the server actions.
 *
 * These live outside `actions.ts` so they can be tested directly. That file
 * carries a "use server" directive and pulls in Supabase clients, next/cache
 * and next/navigation, none of which a rule like "titles are 120 characters or
 * fewer" should need in order to be verified.
 */

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png"
]);

export const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export function ensureSafeText(value: string, maxLength: number, label: string) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
}

/** Narrowed to what the rules actually read, so tests need no real File. */
type UploadCandidate = { size: number; type: string };

export function validateUploadFile(
  file: UploadCandidate,
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

/** Shared by milestone create and update. */
export function validateMilestone(title: string, percentComplete: number) {
  const fieldErrors: Record<string, string> = {};

  if (!title) {
    fieldErrors.title = "Give the milestone a title.";
  }
  if (Number.isNaN(percentComplete) || percentComplete < 0 || percentComplete > 100) {
    fieldErrors.percentComplete = "Enter a whole number between 0 and 100.";
  }

  return fieldErrors;
}
