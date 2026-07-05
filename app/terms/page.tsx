import React from "react";
import Link from "next/link";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-main)] py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline text-sm font-bold">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Kembali ke Halaman Awal
        </Link>
        
        <div className="bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border)] p-8 md:p-12 shadow-sm space-y-6">
          <h1 className="text-3xl font-extrabold tracking-tight">Terms and Conditions</h1>
          <p className="text-[var(--color-text-sub)] text-sm">Last updated: {new Date().toLocaleDateString('id-ID')}</p>
          
          <div className="prose prose-invert max-w-none text-sm text-[var(--color-text-main)] space-y-4 leading-relaxed">
            <h2 className="text-xl font-bold mt-6 mb-2">1. Pendahuluan</h2>
            <p>
              Selamat datang di Seleksia. Dengan mengakses atau menggunakan platform kami, Anda setuju untuk terikat oleh Syarat dan Ketentuan ini.
            </p>

            <h2 className="text-xl font-bold mt-6 mb-2">2. Penggunaan Layanan</h2>
            <p>
              Anda setuju untuk menggunakan layanan ini hanya untuk tujuan yang sah dan sesuai dengan semua hukum dan peraturan yang berlaku.
            </p>

            <h2 className="text-xl font-bold mt-6 mb-2">3. Akun Pengguna</h2>
            <p>
              Anda bertanggung jawab untuk menjaga kerahasiaan kredensial akun Anda dan atas semua aktivitas yang terjadi di bawah akun Anda.
            </p>

            <h2 className="text-xl font-bold mt-6 mb-2">4. Pembayaran dan Langganan</h2>
            <p>
              Layanan tertentu mungkin memerlukan pembayaran. Semua biaya bersifat final dan tidak dapat dikembalikan kecuali diwajibkan oleh hukum.
            </p>
            
            <h2 className="text-xl font-bold mt-6 mb-2">5. Hubungi Kami</h2>
            <p>
              Jika Anda memiliki pertanyaan tentang Syarat dan Ketentuan ini, silakan hubungi kami di <a href="mailto:support@seleksia.com" className="text-[var(--color-primary)] hover:underline">support@seleksia.com</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
