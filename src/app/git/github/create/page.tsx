import { headers } from "next/headers";
import { encodeGithubManifestState } from "@/lib/github-manifest-state";
import {
  isPublicHttpsUrl,
  resolvePublicAppOrigin,
  resolvePublicAppUrl,
} from "@/server/lib/public-url";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function GithubCreatePage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const appName =
    firstQueryValue(searchParams.appName) || "Doktainer GitHub App";
  const configName = firstQueryValue(searchParams.configName);
  const organizationScoped =
    firstQueryValue(searchParams.organizationScoped) === "true";
  const organizationName = firstQueryValue(searchParams.organizationName);

  const headerStore = await headers();
  const normalizedPanelUrl = resolvePublicAppOrigin({ headers: headerStore });
  const hasPublicUrl = isPublicHttpsUrl(normalizedPanelUrl);
  const callbackUrl = resolvePublicAppUrl("/api/providers/github/callback", {
    headers: headerStore,
  });
  const redirectUrl = resolvePublicAppUrl("/git/github/callback", {
    headers: headerStore,
  });
  const webhookUrl = resolvePublicAppUrl("/api/providers/github/webhook", {
    headers: headerStore,
  });
  const manifestAction =
    organizationScoped && organizationName
      ? `https://github.com/organizations/${encodeURIComponent(organizationName)}/settings/apps/new`
      : "https://github.com/settings/apps/new";
  const state = encodeGithubManifestState({
    appName,
    configName,
    organizationScoped,
    organizationName,
    nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  });
  const manifest = JSON.stringify({
    name: appName.trim() || "Doktainer GitHub App",
    url: normalizedPanelUrl,
    redirect_url: redirectUrl,
    callback_urls: [callbackUrl],
    setup_url: `${normalizedPanelUrl}/git`,
    description:
      "Doktainer Git integration for repository access and deployment workflows.",
    public: false,
    request_oauth_on_install: true,
    hook_attributes: {
      url: webhookUrl,
      active: true,
    },
    default_permissions: {
      contents: "read",
      metadata: "read",
      pull_requests: "write",
      checks: "write",
      statuses: "write",
    },
    default_events: ["push", "pull_request", "check_suite", "check_run"],
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#020617",
        padding: 24,
      }}
    >
      <form
        id="github-manifest-form"
        action={manifestAction}
        method="post"
        style={{
          width: "min(560px, 100%)",
          padding: 28,
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(2,6,23,0.92)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          display: "grid",
          gap: 16,
        }}
      >
        <input type="hidden" name="manifest" value={manifest} />
        <input type="hidden" name="state" value={state} />

        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#f8fafc",
            }}
          >
            {hasPublicUrl
              ? "Opening GitHub..."
              : "GitHub App Setup Needs A Public URL"}
          </h1>
        </div>

        {hasPublicUrl ? (
          <>
            <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
              Doktainer is redirecting you to GitHub&apos;s manifest flow so you
              only need to confirm the app name there.
            </div>
            <noscript>
              <button
                type="submit"
                style={{
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid rgba(34,197,94,0.4)",
                  background: "#15803d",
                  color: "#f8fafc",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Continue to GitHub
              </button>
            </noscript>
          </>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.7 }}>
              GitHub App manifests require a publicly reachable HTTPS URL for
              the app homepage, webhook, and callback. The current panel URL is{" "}
              <strong>{normalizedPanelUrl || "not configured"}</strong>, which
              GitHub rejects when it points to localhost or a non-public
              address.
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
              Set <strong>NEXT_PUBLIC_PANEL_URL</strong> or
              <strong> FRONTEND_URL</strong> to your real public Doktainer URL,
              or keep both unset and expose Doktainer through a reverse proxy
              that forwards <strong>X-Forwarded-Host</strong> and
              <strong> X-Forwarded-Proto</strong>. Then try again.
            </div>
          </div>
        )}
      </form>

      {hasPublicUrl ? (
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.requestAnimationFrame(function(){var form=document.getElementById("github-manifest-form"); if(form){ form.submit(); }});',
          }}
        />
      ) : null}
    </main>
  );
}
