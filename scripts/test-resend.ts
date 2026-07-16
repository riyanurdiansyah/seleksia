import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import path from 'path';

// Load variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const resendApiKey = process.env.RESEND_API_KEY;
const rawFrom = process.env.RESEND_DEFAULT_FROM || 'no-reply@seleksia.com';
// Bersihkan jika ada format Name <email> di env agar tidak double
const emailOnly = rawFrom.includes('<') ? rawFrom.match(/<(.+)>/)?.[1] || rawFrom : rawFrom;
const resendDefaultFrom = `TMS Group Assesment <${emailOnly}>`;

if (!resendApiKey) {
  console.error("❌ ERROR: RESEND_API_KEY tidak ditemukan di file .env");
  console.error("Silakan tambahkan RESEND_API_KEY=re_xxxx di file .env Anda.");
  process.exit(1);
}

const resend = new Resend(resendApiKey);

async function testEmail() {
  // Get recipient email from command line argument, or use a placeholder
  const recipient = process.argv[2];

  if (!recipient) {
      console.error("❌ ERROR: Harap masukkan alamat email tujuan.");
      console.error("Gunakan perintah: npx tsx scripts/test-resend.ts <email-tujuan@gmail.com>");
      process.exit(1);
  }

  console.log(`🚀 Mencoba mengirim email ke: ${recipient}`);
  console.log(`📧 Menggunakan pengirim: ${resendDefaultFrom}`);
  console.log(`💡 Catatan: Jika Anda menggunakan domain uji coba Resend (onboarding@resend.dev), email tujuan HARUS email akun Resend Anda.`);

  try {
    const { data, error } = await resend.emails.send({
      from: resendDefaultFrom,
      to: recipient,
      subject: 'Test Integrasi Resend - Seleksia',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Berhasil! 🎉</h2>
          <p>Jika Anda menerima email ini, berarti integrasi <strong>Resend</strong> di aplikasi Seleksia sudah berjalan dengan lancar.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            Dikirim dari script test lokal Seleksia.
          </p>
        </div>
      `
    });

    if (error) {
      console.error("❌ Gagal mengirim email:", error);
      return;
    }

    console.log("✅ Email berhasil terkirim!");
    console.log("🆔 ID Resend:", data?.id);
    
  } catch (err) {
    console.error("❌ Terjadi kesalahan sistem:", err);
  }
}

testEmail();
