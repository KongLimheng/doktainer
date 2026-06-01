import { NextRequest } from "next/server";
import { buildCallbackRedirect } from "../../callback-intent";

export async function GET(request: NextRequest) {
  return buildCallbackRedirect(request, "gitea");
}
