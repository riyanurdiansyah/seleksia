import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSender, targetEmail } = body;

        if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpSender || !targetEmail) {
            return NextResponse.json({ error: "Semua parameter SMTP dan email tujuan wajib diisi" }, { status: 400 });
        }

        // Create nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort, 10),
            secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
            timeout: 10000, // 10s timeout
        } as any);

        // Verify connection configuration
        await transporter.verify();

        // Send a test email
        const mailOptions = {
            from: `"${smtpSender}" <${smtpUser}>`,
            to: targetEmail,
            subject: "Uji Coba Pengiriman Email Seleksia SMTP",
            text: `Halo,\n\nIni adalah email uji coba untuk memverifikasi konfigurasi SMTP kustom Anda di Seleksia.\n\nKoneksi berhasil dan email ini terkirim dengan sukses.\n\nSalam,\nTim Seleksi`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #1B835E; margin-top: 0;">Koneksi SMTP Berhasil!</h2>
                    <p>Halo,</p>
                    <p>Ini adalah email uji coba untuk memverifikasi konfigurasi SMTP kustom Anda di <strong>Seleksia</strong>.</p>
                    <p>Koneksi berhasil dan email ini terkirim dengan sukses menggunakan konfigurasi SMTP perusahaan Anda.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 11px; color: #888; margin-bottom: 0;">Email ini dikirim secara otomatis oleh sistem Seleksia untuk keperluan uji coba.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);

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
