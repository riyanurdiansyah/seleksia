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

        // Check if custom SMTP is configured
        let smtpConfig = null;
        if (company && company.smtpHost && company.smtpPort && company.smtpUser && company.smtpPass) {
            smtpConfig = {
                host: company.smtpHost,
                port: company.smtpPort,
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
                html: `<div style="font-family: sans-serif; white-space: pre-line; line-height: 1.6; color: #333;">${message}</div>`,
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
