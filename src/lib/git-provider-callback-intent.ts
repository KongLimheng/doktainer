import type { GitProviderType } from "@/lib/api";
import { createClientId } from "@/lib/random-id";

const CALLBACK_INTENT_TTL_SECONDS = 15 * 60;

function getCallbackIntentCookieName(provider: GitProviderType): string {
  return `vps_git_callback_intent_${provider}`;
}

function buildCookieAttributes(provider: GitProviderType): string[] {
  const attributes = [
    `Path=/api/providers/${provider}/callback`,
    "SameSite=Lax",
    `Max-Age=${CALLBACK_INTENT_TTL_SECONDS}`,
  ];

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    attributes.push("Secure");
  }

  return attributes;
}

export function markGitProviderCallbackIntent(provider: GitProviderType): void {
  if (typeof document === "undefined") {
    return;
  }

  const nonce = createClientId();

  document.cookie = `${getCallbackIntentCookieName(provider)}=${encodeURIComponent(nonce)}; ${buildCookieAttributes(provider).join("; ")}`;
}

export function getGitProviderCallbackIntentCookieName(
  provider: string,
): string {
  return getCallbackIntentCookieName(provider as GitProviderType);
}
