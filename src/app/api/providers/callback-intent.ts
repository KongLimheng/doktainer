import { NextRequest, NextResponse } from "next/server";

import { getGitProviderCallbackIntentCookieName } from "@/lib/git-provider-callback-intent";
import { resolvePublicAppUrl } from "@/server/lib/public-url";

type GitCallbackProvider = "github" | "gitlab" | "gitea";

export function buildCallbackRedirect(
  request: NextRequest,
  provider: GitCallbackProvider,
) {
  const redirectUrl = new URL(
    resolvePublicAppUrl("/git", {
      headers: request.headers,
      protocol: request.nextUrl.protocol,
    }),
  );
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription =
    request.nextUrl.searchParams.get("error_description") ||
    request.nextUrl.searchParams.get("error_reason");
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const cookieName = getGitProviderCallbackIntentCookieName(provider);
  const pendingIntent = request.cookies.get(cookieName)?.value ?? null;

  redirectUrl.searchParams.set("callbackProvider", provider);

  const response = (status: "success" | "error" | "info", message: string) => {
    redirectUrl.searchParams.set("callbackStatus", status);
    redirectUrl.searchParams.set("callbackMessage", message);

    const nextResponse = NextResponse.redirect(redirectUrl);
    nextResponse.cookies.set(cookieName, "", {
      path: `/api/providers/${provider}/callback`,
      maxAge: 0,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
    return nextResponse;
  };

  if (error || code) {
    if (!pendingIntent) {
      return response(
        "error",
        `The ${provider} callback was not initiated from the current Doktainer session. Start the provider flow again before trusting this response.`,
      );
    }

    if (returnedState && returnedState !== pendingIntent) {
      return response(
        "error",
        `The ${provider} callback state is invalid or has expired. Start the provider flow again.`,
      );
    }
  }

  if (error) {
    return response(
      "error",
      errorDescription || `The ${provider} callback returned ${error}.`,
    );
  }

  if (code) {
    return response(
      "success",
      `The ${provider} callback URL is active and authorization returned successfully. You can continue saving the provider configuration in Doktainer.`,
    );
  }

  return response(
    "info",
    `The ${provider} callback URL is reachable. Complete the provider setup, then return to Doktainer and save the generated credentials.`,
  );
}
