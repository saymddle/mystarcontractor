import { headers } from "next/headers";

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
