import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { cookies } from "next/headers";
import { getCompanyId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

function formatReplyHtml(replyText: string, originalEmail: any, companyName: string) {
  const formattedReply = replyText.replace(/\n/g, "<br/>");
  const origDate = new Date(originalEmail.createdAt).toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const origContent = (originalEmail.text || originalEmail.html || "(Tidak ada konten)")
    .replace(/<[^>]+>/g, " ")
    .slice(0, 800);

  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6; max-width: 650px; margin: 0 auto; padding: 20px;">
      <div style="margin-bottom: 24px;">
        ${formattedReply}
      </div>

      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: bold;">
          Salam hangat,<br/>
          <strong>${companyName}</strong>
        </p>
      </div>

      <div style="margin-top: 30px; padding: 12px 16px; border-left: 3px solid #059669; background-color: #f9fafb; font-size: 12px; color: #6b7280; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #374151;">
          Pada ${origDate}, &lt;${originalEmail.fromEmail}&gt; menulis:
        </p>
        <blockquote style="margin: 0; white-space: pre-wrap; font-style: italic;">
          ${origContent}
        </blockquote>
      </div>

      <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #9ca3af;">
        &copy; ${new Date().getFullYear()} ${companyName} &bull; Powered by Seleksia CBT Platform
      </div>
    </div>
  `;
}

/**
 * POST /api/communication/inbox/reply
 * Send a reply directly to an inbound email via Resend
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inboundEmailId, replyMessage, customSubject } = body;

    if (!inboundEmailId || !replyMessage || !replyMessage.trim()) {
      return NextResponse.json(
        { error: "inboundEmailId dan replyMessage wajib diisi" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const role = cookieStore.get("userRole")?.value || "user";

    // 1. Fetch Inbound Email
    const inbound = await prisma.inboundEmail.findUnique({
      where: { id: inboundEmailId },
      include: { company: true, candidate: true },
    });

    if (!inbound) {
      return NextResponse.json({ error: "Email masuk tidak ditemukan" }, { status: 404 });
    }

    // 2. Tenant verification
    if (role !== "superadmin") {
      const companyId = await getCompanyId();
      if (inbound.companyId && inbound.companyId !== companyId) {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
      }
    }

    // 3. Sender configuration: Prioritize company slug (e.g. tms-group@seleksia.com)
    const company = inbound.company;
    const companyName = company?.name || "Seleksia Support";
    
    let senderEmail = "support@seleksia.com";
    if (company?.slug) {
      senderEmail = `${company.slug.toLowerCase()}@seleksia.com`;
    } else if (inbound.toEmail && inbound.toEmail.endsWith("@seleksia.com")) {
      senderEmail = inbound.toEmail;
    } else if (company?.smtpUser) {
      const raw = company.smtpUser;
      senderEmail = raw.includes("<") ? raw.match(/<(.+)>/)?.[1] || raw : raw;
    } else {
      senderEmail = process.env.RESEND_DEFAULT_FROM || "support@seleksia.com";
      if (senderEmail.includes("<")) {
        senderEmail = senderEmail.match(/<(.+)>/)?.[1] || senderEmail;
      }
    }

    const fromHeader = `${companyName} <${senderEmail}>`;

    // 4. Construct Subject & Threading Headers
    const replySubject = customSubject?.trim() || 
      (inbound.subject?.startsWith("Re:") ? inbound.subject : `Re: ${inbound.subject || "Pesan Anda"}`);

    const htmlContent = formatReplyHtml(replyMessage, inbound, companyName);

    // 5. Send via Resend API
    const emailPayload: any = {
      from: fromHeader,
      to: inbound.fromEmail,
      replyTo: senderEmail,
      subject: replySubject,
      text: replyMessage,
      html: htmlContent,
    };

    // Threading header if available
    if (inbound.messageId) {
      emailPayload.headers = {
        "In-Reply-To": inbound.messageId,
        "References": inbound.messageId,
      };
    }

    let resendResponseId = null;

    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("dummy")) {
      const { data, error } = await resend.emails.send(emailPayload);

      if (error) {
        console.error("[Resend Reply Error]:", error);
        return NextResponse.json(
          { error: `Gagal mengirim balasan: ${error.message}` },
          { status: 500 }
        );
      }
      resendResponseId = data?.id;
    } else {
      console.log(`[SIMULATED REPLY] Sent to: ${inbound.fromEmail} | Subject: ${replySubject}`);
    }

    // 6. Update Status in DB to 'replied'
    await prisma.inboundEmail.update({
      where: { id: inbound.id },
      data: {
        status: "replied",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Balasan email berhasil dikirimkan ke ${inbound.fromEmail}`,
      resendId: resendResponseId,
      recipient: inbound.fromEmail,
      status: "replied",
    });
  } catch (error) {
    console.error("POST /api/communication/inbox/reply error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
