import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

function formatWaktuPelaksanaan(start: Date | null | undefined, end: Date | null | undefined): string {
    if (!start || !end) return "Belum ditentukan";

    const idLocale = "id-ID";
    const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

    const formatTime = (d: Date) => d.toLocaleTimeString(idLocale, timeOptions).replace('.', ':');
    const formatDate = (d: Date) => d.toLocaleDateString(idLocale, dateOptions);

    const isSameDay =
        start.getDate() === end.getDate() &&
        start.getMonth() === end.getMonth() &&
        start.getFullYear() === end.getFullYear();

    if (isSameDay) {
        return `${formatDate(start)} ${formatTime(start)} - ${formatTime(end)}`;
    } else {
        return `${formatDate(start)} ${formatTime(start)} - ${formatDate(end)} ${formatTime(end)}`;
    }
}

export async function sendWelcomeEmail(candidateId: string, plainPassword?: string) {
    try {
        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                company: true,
                assignments: {
                    include: { test: true }
                }
            }
        });

        if (!candidate || !candidate.email) return;

        const company = candidate.company;
        const passwordToUse = plainPassword || candidate.displayId;

        // Determine sender email (Prioritize company.slug@seleksia.com)
        let senderEmail = "support@seleksia.com";
        if (company?.slug) {
            senderEmail = `${company.slug.toLowerCase()}@seleksia.com`;
        } else if (company?.smtpUser) {
            const raw = company.smtpUser;
            senderEmail = raw.includes('<') ? raw.match(/<(.+)>/)?.[1] || raw : raw;
        } else {
            const raw = process.env.RESEND_DEFAULT_FROM || "support@seleksia.com";
            senderEmail = raw.includes('<') ? raw.match(/<(.+)>/)?.[1] || raw : raw;
        }

        const senderName = company?.name ? `${company.name} Assessment` : "Seleksia Assessment";

        if (!process.env.RESEND_API_KEY) {
            console.warn(`[DEV MODE] Welcome email intended for ${candidate.email}`);
            console.warn(`[DEV MODE] Password: ${passwordToUse}`);
            return;
        }

        const loginUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/login` : "http://localhost:3000/login";

        // Fetch custom template from database
        const template = await prisma.emailTemplate.findFirst({
            where: { companyId: company.id, isDefault: true }
        });

        const waktuPelaksanaan = formatWaktuPelaksanaan(candidate.accessStart, candidate.accessEnd);
        const testName = candidate.assignments?.[0]?.test?.name || "Test Assessment";

        let subject = `Undangan Seleksi - ${company?.name || "Seleksia"}`;
        let htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h2 style="color: #059669;">Undangan Seleksi</h2>
                    <p>Halo <strong>${candidate.name}</strong>,</p>
                    <p>Anda telah diundang untuk mengikuti asesmen di platform <strong>${company?.name || "Seleksia"}</strong>.</p>
                    <p>Berikut adalah informasi akun Anda untuk masuk ke sistem:</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>URL Login:</strong> <a href="${loginUrl}" style="color: #059669;">${loginUrl}</a></p>
                        <p style="margin: 0 0 10px 0;"><strong>Username:</strong> ${candidate.email}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Password:</strong> ${passwordToUse}</p>
                        <p style="margin: 0;"><strong>Waktu Pelaksanaan:</strong> ${waktuPelaksanaan}</p>
                    </div>

                    <p>Silakan masuk dan segera ganti kata sandi Anda demi keamanan.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Sekarang</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">&copy; ${new Date().getFullYear()} ${company?.name || "Seleksia"}</p>
                </div>
            `;

        const companyEmail = senderEmail;
        const companyPhone = company?.phone || "-";
        const companySlug = company?.slug || "";

        if (template) {
            subject = template.subject
                .replace(/\{\{company_name\}\}/g, company?.name || "Seleksia")
                .replace(/\{\{company_email\}\}/g, companyEmail)
                .replace(/\{\{support_email\}\}/g, companyEmail)
                .replace(/\{\{company_phone\}\}/g, companyPhone)
                .replace(/\{\{phone\}\}/g, companyPhone)
                .replace(/\{\{company_slug\}\}/g, companySlug);

            htmlContent = template.content
                .replace(/\{\{candidate_name\}\}/g, candidate.name)
                .replace(/\{\{name\}\}/g, candidate.name)
                .replace(/\{\{company_name\}\}/g, company?.name || "Seleksia")
                .replace(/\{\{company_email\}\}/g, companyEmail)
                .replace(/\{\{support_email\}\}/g, companyEmail)
                .replace(/\{\{company_phone\}\}/g, companyPhone)
                .replace(/\{\{phone\}\}/g, companyPhone)
                .replace(/\{\{company_slug\}\}/g, companySlug)
                .replace(/\{\{login_url\}\}/g, loginUrl)
                .replace(/\{\{username\}\}/g, candidate.email)
                .replace(/\{\{email\}\}/g, candidate.email)
                .replace(/\{\{password\}\}/g, passwordToUse)
                .replace(/\{\{displayId\}\}/g, candidate.displayId)
                .replace(/\{\{waktu_pelaksanaan\}\}/g, waktuPelaksanaan)
                .replace(/\{\{test_name\}\}/g, testName);
        }

        const { error } = await resend.emails.send({
            from: `${senderName} <${senderEmail}>`,
            to: candidate.email,
            replyTo: senderEmail,
            subject: subject,
            html: htmlContent,
        });

        if (error) {
            console.error("Failed to send welcome email via Resend:", error);
            return;
        }

        console.log(`Welcome email sent to ${candidate.email}`);
    } catch (error) {
        console.error("Failed to send welcome email:", error);
    }
}
