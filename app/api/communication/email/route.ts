import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidateId, subject, message } = body;

        if (!candidateId || !subject || !message) {
            return NextResponse.json({ error: "Candidate ID, subject, and message are required" }, { status: 400 });
        }

        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: { company: true }
        });

        if (!candidate) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        const company = candidate.company;
        const companyName = company?.name || "Seleksia";
        const appUrl = process.env.NEXTAUTH_URL || "https://seleksia.com";

        // Check if custom SMTP is configured (Mailcow or custom)
        let smtpConfig = null;
        if (company && company.smtpUser && company.smtpPass) {
            smtpConfig = {
                host: company.smtpHost || process.env.SMTP_HOST || "mail.seleksia.com",
                port: company.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465),
                user: company.smtpUser,
                pass: company.smtpPass,
                sender: company.smtpSender || company.name || "Seleksia Ujian",
            };
        } else if (
            process.env.SMTP_HOST &&
            process.env.SMTP_PORT &&
            process.env.SMTP_USER &&
            process.env.SMTP_PASS
        ) {
            // Fallback to global SMTP
            smtpConfig = {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT, 10),
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
                sender: process.env.SMTP_SENDER || "Seleksia",
            };
        }

        if (smtpConfig) {
            // Send real email using Nodemailer
            const transporter = nodemailer.createTransport({
                host: smtpConfig.host,
                port: smtpConfig.port,
                secure: smtpConfig.port === 465,
                auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.pass,
                },
                timeout: 10000,
            } as any);

            const mailOptions = {
                from: `"${smtpConfig.sender}" <${smtpConfig.user}>`,
                to: candidate.email,
                subject: subject,
                text: message,
                html: getEmailWrapper(parseMessageToHtml(message, appUrl), companyName),
            };

            await transporter.sendMail(mailOptions);
            console.log(`[SMTP EMAIL SENT] To: ${candidate.email}, Subject: ${subject}`);
        } else {
            // Simulate sending email (600ms delay)
            await new Promise(r => setTimeout(r, 600));
            console.log(`[EMAIL SIMULATED (No SMTP Config)] To: ${candidate.email}, Subject: ${subject}`);
        }

        return NextResponse.json({
            success: true,
            recipient: candidate.email,
            message: `Email successfully sent to ${candidate.name} (${candidate.email})`
        });
    } catch (error: any) {
        console.error("POST /api/communication/email error:", error);
        return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
    }
}

function parseMessageToHtml(message: string, appUrl: string): string {
    const paragraphs = message.split(/\n\s*\n/);
    let htmlContent = "";

    for (const paragraph of paragraphs) {
        const lines = paragraph.trim().split("\n");
        
        // Check if all lines are list items
        const isList = lines.every(line => /^\s*[-*•]\s+/.test(line));
        
        if (isList) {
            let listHtml = `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <table style="width: 100%; border-collapse: collapse; font-family: inherit;">`;
                
            for (const line of lines) {
                const bulletMatch = line.match(/^\s*[-*•]\s*(.*)$/);
                if (bulletMatch) {
                    const content = bulletMatch[1].trim();
                    const kvMatch = content.match(/^(.*?):\s*(.*)$/);
                    if (kvMatch) {
                        const label = kvMatch[1].trim();
                        const value = kvMatch[2].trim();
                        
                        let displayValue = value;
                        if (label.toLowerCase().includes("id login") || label.toLowerCase().includes("display id") || label.toLowerCase().includes("username") || label.toLowerCase().includes("kredensial")) {
                            displayValue = `<code style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background-color: #f1f5f9; color: #4f46e5; padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">${value}</code>`;
                        } else if (label.toLowerCase().includes("email")) {
                            displayValue = `<a href="mailto:${value}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${value}</a>`;
                        } else {
                            displayValue = `<span style="font-weight: 600; color: #1e293b;">${value}</span>`;
                        }
                        
                        listHtml += `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 500; width: 35%; vertical-align: top; font-family: inherit;">${label}</td>
                            <td style="padding: 12px 0; color: #1e293b; font-size: 14px; width: 65%; vertical-align: top; font-family: inherit;">${displayValue}</td>
                        </tr>`;
                    } else {
                        listHtml += `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td colspan="2" style="padding: 12px 0; color: #334155; font-size: 14px; vertical-align: top; font-family: inherit;">
                                <span style="color: #4f46e5; font-weight: bold; margin-right: 8px;">•</span>
                                <span>${content}</span>
                            </td>
                        </tr>`;
                    }
                }
            }
            
            listHtml += `
                </table>
            </div>`;
            htmlContent += listHtml;
        } else {
            const textContent = lines.join("<br/>").trim();
            const firstLine = lines[0].trim();
            
            if (/^(halo|dear|kepada|assalamu|hi\b)/i.test(firstLine)) {
                htmlContent += `<p style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${textContent}</p>`;
            } else if (lines.length <= 2 && /^(salam|hormat kami|regards|terima kasih|best regards)/i.test(firstLine)) {
                htmlContent += `
                <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <p style="margin: 0; font-style: italic;">${lines[0]}</p>
                    ${lines[1] ? `<p style="margin: 4px 0 0 0; font-weight: 700; color: #334155;">${lines[1]}</p>` : ""}
                </div>`;
            } else {
                htmlContent += `<p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${textContent}</p>`;
                
                if (textContent.toLowerCase().includes("masukkan kredensial") || textContent.toLowerCase().includes("memulai ujian") || textContent.toLowerCase().includes("mulai ujian")) {
                    htmlContent += `
                    <div style="text-align: center; margin: 32px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        <a href="${appUrl}" target="_blank" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1); font-family: inherit;">
                            Mulai Ujian Sekarang
                        </a>
                    </div>`;
                }
            }
        }
    }
    return htmlContent;
}

function getEmailWrapper(contentHtml: string, companyName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=device-width, initial-scale=1.0">
    <title>Undangan Seleksi</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 40px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02); border: 1px solid #e5e7eb;">
                    <!-- Brand Top Header -->
                    <tr>
                        <td style="background-color: #4f46e5; padding: 28px 32px; text-align: left; border-bottom: 4px solid #06b6d4;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <span style="color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">SELEKSIA</span>
                                    </td>
                                    <td align="right">
                                        <span style="color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; background-color: rgba(255, 255, 255, 0.15); padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.25);">CBT Platform</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px 32px 32px;">
                            ${contentHtml}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 11px; color: #6b7280; line-height: 1.6;">
                                Email ini dikirim secara otomatis oleh platform ujian daring <strong>Seleksia</strong> atas nama <strong>${companyName}</strong>. 
                                Mohon untuk tidak membalas email ini secara langsung.
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 11px; color: #9ca3af;">
                                &copy; ${new Date().getFullYear()} Seleksia. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

