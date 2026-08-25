import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyResendWebhookSignature,
  extractEmailAddress,
  isSeleksiaDomain,
  matchCandidateAndCompany,
  fetchResendInboundEmailDetails,
  SvixHeaders,
} from "@/lib/resend-webhook";

export const dynamic = "force-dynamic";

/**
 * GET /api/webhook/resend
 * Health check & configuration status for Resend Webhook.
 */
export async function GET() {
  const isSecretConfigured = !!process.env.RESEND_WEBHOOK_SECRET;
  const isApiKeyConfigured = !!process.env.RESEND_API_KEY;

  return NextResponse.json({
    status: "ok",
    service: "Resend Inbound & Events Webhook",
    domain: "seleksia.com",
    configured: {
      hasApiKey: isApiKeyConfigured,
      hasWebhookSecret: isSecretConfigured,
    },
    message: "Resend webhook endpoint is active and listening for events (e.g. email.received).",
  });
}

/**
 * POST /api/webhook/resend
 * Handles incoming webhooks from Resend (especially email.received for @seleksia.com).
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. Extract Svix signature headers
    const svixHeaders: SvixHeaders = {
      id: req.headers.get("svix-id"),
      timestamp: req.headers.get("svix-timestamp"),
      signature: req.headers.get("svix-signature"),
    };

    // 2. Verify Svix signature if webhook secret is configured
    const verification = verifyResendWebhookSignature({
      payload: rawBody,
      headers: svixHeaders,
    });

    if (!verification.isValid) {
      console.warn("[Resend Webhook] Signature verification failed:", verification.error);
      return NextResponse.json(
        { error: verification.error || "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // 3. Parse Webhook Payload
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventType = event.type || "unknown";
    const data = event.data || {};

    console.log(`[Resend Webhook] Received event: ${eventType} | ID: ${data.id || data.email_id || "N/A"}`);

    // 4. Handle "email.received" (Inbound Email)
    if (eventType === "email.received" || eventType === "inbound.email" || (!event.type && (data.from || data.to))) {
      const resendId = data.email_id || data.id || null;
      const rawFrom = String(data.from || "");
      const fromEmail = extractEmailAddress(rawFrom);

      // Extract recipient(s)
      const rawTo = Array.isArray(data.to) ? data.to : [String(data.to || "")];
      const toEmails = rawTo.map((t: string) => extractEmailAddress(t)).filter(Boolean);
      const primaryToEmail = toEmails[0] || "";

      // Check if any recipient belongs to @seleksia.com
      const hasSeleksiaRecipient = toEmails.some((email: string) => isSeleksiaDomain(email, "seleksia.com"));

      let subject = data.subject || "(No Subject)";
      let textContent = data.text || null;
      let htmlContent = data.html || null;
      let rawHeaders = data.headers ? JSON.stringify(data.headers) : null;
      let attachmentsData = data.attachments ? JSON.stringify(data.attachments) : null;
      let messageId = data.message_id || data.headers?.["message-id"] || null;

      // If content is empty and we have a Resend email ID, attempt to fetch complete email details from Resend API
      if (resendId && (!textContent && !htmlContent)) {
        const fullDetails = await fetchResendInboundEmailDetails(resendId);
        if (fullDetails) {
          textContent = fullDetails.text || textContent;
          htmlContent = fullDetails.html || htmlContent;
          if (fullDetails.headers && !rawHeaders) {
            rawHeaders = JSON.stringify(fullDetails.headers);
          }
          if (fullDetails.attachments && !attachmentsData) {
            attachmentsData = JSON.stringify(fullDetails.attachments);
          }
          if (fullDetails.message_id && !messageId) {
            messageId = fullDetails.message_id;
          }
        }
      }

      // Check associations with existing Candidate and Company
      const { candidateId, companyId } = await matchCandidateAndCompany(fromEmail, primaryToEmail);

      const status = hasSeleksiaRecipient ? "received" : "ignored_non_seleksia_domain";

      // Save or update inbound email in database (Idempotent by resendId if provided)
      let savedEmail;
      if (resendId) {
        savedEmail = await prisma.inboundEmail.upsert({
          where: { resendId },
          update: {
            from: rawFrom,
            fromEmail,
            to: rawTo.join(", "),
            toEmail: primaryToEmail,
            subject,
            text: textContent,
            html: htmlContent,
            rawHeaders,
            attachments: attachmentsData,
            messageId,
            status,
            companyId,
            candidateId,
            updatedAt: new Date(),
          },
          create: {
            resendId,
            messageId,
            from: rawFrom,
            fromEmail,
            to: rawTo.join(", "),
            toEmail: primaryToEmail,
            subject,
            text: textContent,
            html: htmlContent,
            rawHeaders,
            attachments: attachmentsData,
            status,
            companyId,
            candidateId,
          },
        });
      } else {
        savedEmail = await prisma.inboundEmail.create({
          data: {
            from: rawFrom,
            fromEmail,
            to: rawTo.join(", "),
            toEmail: primaryToEmail,
            subject,
            text: textContent,
            html: htmlContent,
            rawHeaders,
            attachments: attachmentsData,
            messageId,
            status,
            companyId,
            candidateId,
          },
        });
      }

      console.log(
        `[Resend Webhook] Inbound email processed successfully: ${savedEmail.id} | From: ${fromEmail} -> To: ${primaryToEmail} | Domain @seleksia.com: ${hasSeleksiaRecipient}`
      );

      return NextResponse.json({
        success: true,
        message: "Inbound email captured successfully",
        id: savedEmail.id,
        resendId: savedEmail.resendId,
        from: savedEmail.fromEmail,
        to: savedEmail.toEmail,
        isSeleksiaDomain: hasSeleksiaRecipient,
        status: savedEmail.status,
      });
    }

    // 5. Handle other Resend Events (e.g. email.delivered, email.bounced, email.complained)
    console.log(`[Resend Webhook] Acknowledged event ${eventType}`);
    return NextResponse.json({
      success: true,
      event: eventType,
      message: `Event ${eventType} received and acknowledged`,
    });
  } catch (error) {
    console.error("[Resend Webhook Error]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
