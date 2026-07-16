import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { smtpUser, smtpSender, targetEmail } = body;

        if (!targetEmail) {
            return NextResponse.json({ error: "Email tujuan wajib diisi" }, { status: 400 });
        }

        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ error: "Resend API Key belum dikonfigurasi di server" }, { status: 500 });
        }

        let rawEmail = smtpUser || process.env.RESEND_DEFAULT_FROM || "noreply@seleksia.com";
        const senderEmail = rawEmail.includes('<') ? rawEmail.match(/<(.+)>/)?.[1] || rawEmail : rawEmail;
        const senderName = smtpSender || "Seleksia";

        // Send a test email
        const { error } = await resend.emails.send({
            from: `${senderName} <${senderEmail}>`,
            to: targetEmail,
            subject: "Uji Coba Pengiriman Email Seleksia (Resend)",
            text: `Halo,\n\nIni adalah email uji coba untuk memverifikasi konfigurasi email Anda di Seleksia.\n\nKoneksi berhasil dan email ini terkirim dengan sukses.\n\nSalam,\nTim Seleksi`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #1B835E; margin-top: 0;">Integrasi Email Berhasil!</h2>
                    <p>Halo,</p>
                    <p>Ini adalah email uji coba untuk memverifikasi konfigurasi email Anda di <strong>Seleksia</strong>.</p>
                    <p>Koneksi berhasil dan email ini terkirim dengan sukses.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 11px; color: #888; margin-bottom: 0;">Email ini dikirim secara otomatis oleh sistem Seleksia untuk keperluan uji coba.</p>
                </div>
            `,
        });

        if (error) {
            return NextResponse.json({ error: error.message || "Gagal mengirim email test melalui Resend" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Email uji coba berhasil dikirim ke ${targetEmail}`
        });
    } catch (error: any) {
        console.error("POST /api/settings/email/test error:", error);
        return NextResponse.json({
            error: error.message || "Gagal menghubungi server SMTP. Silakan periksa kembali konfigurasi Anda."
        }, { status: 500 });
    }
}
