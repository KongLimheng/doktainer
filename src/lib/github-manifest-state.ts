const GITHUB_MANIFEST_STATE_KEY = "vps_github_manifest_state";

export type GithubManifestState = {
  appName: string;
  configName: string;
  organizationScoped: boolean;
  organizationName: string;
  nonce: string;
};

type StoredGithubManifestState = {
  rawState: string;
  payload: GithubManifestState;
};

export function encodeGithubManifestState(
  payload: GithubManifestState,
): string {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeGithubManifestState(
  rawState: string | null,
): GithubManifestState | null {
  if (!rawState) {
    return null;
  }

  try {
    const normalized = rawState.replace(/-/g, "+").replace(/_/g, "/");
    const padding =
      normalized.length % 4 === 0
        ? ""
        : "=".repeat(4 - (normalized.length % 4));
    const decoded = atob(`${normalized}${padding}`);
    return JSON.parse(decoded) as GithubManifestState;
  } catch {
    return null;
  }
}

export function storeGithubManifestState(rawState: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload = decodeGithubManifestState(rawState);
  if (!payload) {
    return;
  }

  window.sessionStorage.setItem(
    GITHUB_MANIFEST_STATE_KEY,
    JSON.stringify({ rawState, payload } satisfies StoredGithubManifestState),
  );
}

export function consumeGithubManifestState(
  expectedRawState: string | null,
): GithubManifestState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem(GITHUB_MANIFEST_STATE_KEY);
  window.sessionStorage.removeItem(GITHUB_MANIFEST_STATE_KEY);

  if (!stored || !expectedRawState) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as StoredGithubManifestState;
    if (parsed.rawState !== expectedRawState) {
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
}
