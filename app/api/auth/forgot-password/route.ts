import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

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
        
        let rawEmail = (company && company.smtpUser) ? company.smtpUser : (process.env.RESEND_DEFAULT_FROM || "noreply@seleksia.com");
        const senderEmail = rawEmail.includes('<') ? rawEmail.match(/<(.+)>/)?.[1] || rawEmail : rawEmail;
        const senderName = company?.name ? `${company.name} Assessment` : "TMS Group Assessment";

        if (!process.env.RESEND_API_KEY) {
            console.warn("Resend API key not configured. Cannot send password reset email.");
            console.log(`[DEV MODE] Password Reset Token for ${email}: ${resetToken}`);
            return NextResponse.json({ 
                success: true, 
                message: "If the email is registered, a reset link has been sent.",
                devToken: process.env.NODE_ENV === "development" ? resetToken : undefined
            });
        }

        // Construct reset link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get("origin") || "http://localhost:3000");
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

        try {
            const { error } = await resend.emails.send({
                from: `${senderName} <${senderEmail}>`,
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
            });
            
            if (error) {
                console.error("Failed to send Resend email:", error);
                return NextResponse.json({ error: "Gagal mengirim email. Harap hubungi administrator (Cek pengaturan Resend)." }, { status: 500 });
            }
        } catch (mailError) {
            console.error("Failed to send email:", mailError);
            return NextResponse.json({ error: "Gagal mengirim email. Harap hubungi administrator." }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "If the email is registered, a reset link has been sent." });

    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Terjadi kesalahan internal server. Harap hubungi admin." }, { status: 500 });
    }
}
