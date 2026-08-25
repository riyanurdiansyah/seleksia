import { NextRequest } from "next/server";
import { GET as handleGet, POST as handlePost } from "../route";

export const dynamic = "force-dynamic";

/**
 * Dedicated alias for Resend Inbound Email Webhook
 * Route: /api/webhook/resend/inbound
 */
export async function GET(req: NextRequest) {
  return handleGet();
}

export async function POST(req: NextRequest) {
  return handlePost(req);
}
