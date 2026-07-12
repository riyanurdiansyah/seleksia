import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function sendWelcomeEmail(candidateId: string, plainPassword?: string) {
    try {
        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: { company: true }
        });

        if (!candidate || !candidate.email) return;

        const company = candidate.company;
        const passwordToUse = plainPassword || candidate.displayId;

        const smtpHost = company.smtpHost || process.env.SMTP_HOST;
        const smtpPort = company.smtpPort || process.env.SMTP_PORT;
        const smtpUser = company.smtpUser || process.env.SMTP_USER;
        const smtpPass = company.smtpPass || process.env.SMTP_PASS;
        const smtpSender = company.smtpSender || process.env.SMTP_SENDER || "noreply@seleksia.com";

        if (!smtpHost || !smtpUser || !smtpPass) {
            console.warn(`[DEV MODE] Welcome email intended for ${candidate.email}`);
            console.warn(`[DEV MODE] Password: ${passwordToUse}`);
            return;
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

        const loginUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/login` : "http://localhost:3000/login";

        const mailOptions = {
            from: {
                name: `${company.name} Assessment`,
                address: smtpSender
            },
            to: candidate.email,
            subject: `Undangan Seleksi - ${company.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h2 style="color: #059669;">Undangan Seleksi</h2>
                    <p>Halo <strong>${candidate.name}</strong>,</p>
                    <p>Anda telah diundang untuk mengikuti asesmen di platform <strong>${company.name}</strong>.</p>
                    <p>Berikut adalah informasi akun Anda untuk masuk ke sistem:</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>URL Login:</strong> <a href="${loginUrl}" style="color: #059669;">${loginUrl}</a></p>
                        <p style="margin: 0 0 10px 0;"><strong>Username:</strong> ${candidate.email}</p>
                        <p style="margin: 0;"><strong>Password:</strong> ${passwordToUse}</p>
                    </div>

                    <p>Silakan masuk dan segera ganti kata sandi Anda demi keamanan.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Sekarang</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">&copy; ${new Date().getFullYear()} ${company.name}</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${candidate.email}`);
    } catch (error) {
        console.error("Failed to send welcome email:", error);
    }
}
