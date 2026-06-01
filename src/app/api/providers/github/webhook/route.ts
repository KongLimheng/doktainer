import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "GitHub webhook endpoint is reachable.",
  });
}

export async function POST(request: NextRequest) {
  const event = request.headers.get("x-github-event") || "unknown";
  return NextResponse.json({ success: true, received: true, event });
}
