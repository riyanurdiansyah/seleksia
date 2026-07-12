import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Find all candidates with this email across all companies
        const candidates = await prisma.candidate.findMany({
            where: { email: email.toLowerCase() },
            include: { company: true }
        });

        if (candidates.length === 0) {
            // Return success even if not found to prevent email enumeration
            return NextResponse.json({ success: true, message: "If the email is registered, a reset link has been sent." });
        }

        // Generate a random token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Update all accounts associated with this email
        await prisma.candidate.updateMany({
            where: { email: email.toLowerCase() },
            data: {
                resetToken,
                resetTokenExpiry
            }
        });

        // Use the first company's SMTP settings if available, otherwise fallback to env
        const company = candidates[0].company;
        
        const smtpHost = company.smtpHost || process.env.SMTP_HOST;
        const smtpPort = company.smtpPort || process.env.SMTP_PORT;
        const smtpUser = company.smtpUser || process.env.SMTP_USER;
        const smtpPass = company.smtpPass || process.env.SMTP_PASS;
        const smtpSender = company.smtpSender || process.env.SMTP_SENDER || "noreply@seleksia.com";

        if (!smtpHost || !smtpUser || !smtpPass) {
            console.warn("SMTP settings are not configured. Cannot send password reset email.");
            // If no SMTP is configured, just pretend it was sent for security, or return a specific error.
            // For development purposes, we can return the token in the response or just log it.
            console.log(`[DEV MODE] Password Reset Token for ${email}: ${resetToken}`);
            return NextResponse.json({ 
                success: true, 
                message: "If the email is registered, a reset link has been sent.",
                devToken: process.env.NODE_ENV === "development" ? resetToken : undefined
            });
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort) || 587,
            secure: Number(smtpPort) === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        // Construct reset link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get("origin") || "http://localhost:3000");
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: `"${company.name} Assessment" <${smtpSender}>`,
            to: email,
            subject: "Reset Password Konfirmasi",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h2 style="color: #059669;">Reset Password</h2>
                    <p>Halo ${candidates[0].name},</p>
                    <p>Kami menerima permintaan untuk mereset kata sandi akun Anda. Jika Anda merasa tidak meminta ini, abaikan email ini.</p>
                    <p>Untuk mereset kata sandi Anda, klik tombol di bawah ini:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password Sekarang</a>
                    </div>
                    <p>Atau salin tautan berikut ke browser Anda:</p>
                    <p style="word-break: break-all; color: #4b5563; font-size: 14px;">${resetLink}</p>
                    <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">Tautan ini akan kedaluwarsa dalam 1 jam.</p>
                    <p style="font-size: 12px; color: #6b7280;">&copy; ${new Date().getFullYear()} ${company.name}</p>
                </div>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            console.error("Failed to send SMTP email:", mailError);
            return NextResponse.json({ error: "Gagal mengirim email. Harap hubungi administrator (Cek pengaturan SMTP)." }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "If the email is registered, a reset link has been sent." });

    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Terjadi kesalahan internal server. Harap hubungi admin." }, { status: 500 });
    }
}
