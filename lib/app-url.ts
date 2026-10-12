import { headers } from "next/headers";

/**
 * Synchronous origin for static metadata exports, which cannot await headers().
 * Falls back to localhost during local development.
 */
export function getConfiguredOrigin() {
  const configuredOrigin =
    process.env.APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_ORIGIN;

  return configuredOrigin
    ? configuredOrigin.replace(/\/$/, "")
    : "http://localhost:3000";
}

export async function getAppOrigin() {
  const configuredOrigin = process.env.APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_ORIGIN;

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  if (host) {
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}
