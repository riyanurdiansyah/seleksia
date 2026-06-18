"use client";

import { useState, useEffect } from "react";

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Form inputs
    const [companyName, setCompanyName] = useState("");
    const [companySlug, setCompanySlug] = useState("");
    const [adminName, setAdminName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState("Free");

    // Password strength logic
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: "Sangat Lemah", color: "bg-red-500" });

    useEffect(() => {
        if (!adminPassword) {
            setPasswordStrength({ score: 0, text: "Sangat Lemah", color: "bg-red-500" });
            return;
        }
        let score = 0;
        if (adminPassword.length >= 6) score += 1;
        if (adminPassword.length >= 10) score += 1;
        if (/[A-Z]/.test(adminPassword)) score += 1;
        if (/[0-9]/.test(adminPassword)) score += 1;
        if (/[^A-Za-z0-9]/.test(adminPassword)) score += 1;

        if (score <= 2) {
            setPasswordStrength({ score, text: "Lemah", color: "bg-orange-500" });
        } else if (score <= 4) {
            setPasswordStrength({ score, text: "Sedang", color: "bg-yellow-500" });
        } else {
            setPasswordStrength({ score, text: "Sangat Kuat", color: "bg-emerald-500" });
        }
    }, [adminPassword]);

    // Handle company slug auto-generation
    const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCompanyName(val);
        // slugify
        const slug = val
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
        setCompanySlug(slug);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName,
                    companySlug,
                    adminName,
                    adminEmail,
                    adminPassword,
                    planName: selectedPlan
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Pendaftaran gagal. Silakan coba lagi.");
                setLoading(false);
                return;
            }

            // Save admin session data
            if (data.candidate) {
                sessionStorage.setItem("candidateId", data.candidate.id);
                sessionStorage.setItem("candidateName", data.candidate.name);
                sessionStorage.setItem("candidateDisplayId", data.candidate.displayId);
                sessionStorage.setItem("candidateRole", data.candidate.role);
            }

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = data.redirectTo || "/dashboard";
            }, 800);

        } catch (err) {
            setError("Kesalahan jaringan. Harap periksa koneksi Anda.");
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="min-h-screen flex font-sans bg-[var(--color-bg-base)] transition-colors duration-300">
            {/* Left Panel — Branding & Plan Benefits */}
            <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#1A3C40] via-[#0c5c64] to-[#059669] relative overflow-hidden flex-col justify-between p-12">
                {/* Subtle grid pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                
                {/* Premium blur circles */}
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-white opacity-10 rounded-full blur-[90px] pointer-events-none" />
                <div className="absolute bottom-0 -right-32 w-[400px] h-[400px] bg-[var(--color-accent)] opacity-10 rounded-full blur-[100px] pointer-events-none" />

                {/* Header Branding */}
                <div className="relative z-10 flex items-center">
                    <img src="/full-logo.png" alt="SELEKSIA Logo" className="h-16 w-[220px] object-contain brightness-0 invert" style={{ filter: "brightness(0) invert(1)" }} />
                </div>

                {/* Dynamic Content depending on current step */}
                <div className="relative z-10 max-w-lg my-auto space-y-6 text-white">
                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Langkah 1 dari 3</span>
                            <h2 className="text-4xl font-extrabold leading-tight">Buat Ruang Ujian Perusahaan Anda</h2>
                            <p className="text-white/80 text-sm leading-relaxed">
                                SELEKSIA menggunakan arsitektur multi-tenant. Dengan mendaftarkan perusahaan, Anda mendapatkan subdomain unik untuk memisahkan data kandidat, ujian, dan hasil asesmen Anda secara aman.
                            </p>
                            <div className="space-y-3 pt-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                                    <span className="text-sm">Subdomain instan untuk ujian kandidat</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                                    <span className="text-sm">Isolasi data 100% aman dan terenkripsi</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-fade-in">
                            <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Langkah 2 dari 3</span>
                            <h2 className="text-4xl font-extrabold leading-tight">Akun Administrator Utama</h2>
                            <p className="text-white/80 text-sm leading-relaxed">
                                Akun ini akan bertindak sebagai Super Administrator yang memegang kendali penuh atas konfigurasi CBT, pembuatan soal, monitoring pelanggaran webcam proctoring, hingga penarikan laporan otomatis.
                            </p>
                            <div className="space-y-3 pt-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-400">security</span>
                                    <span className="text-sm">Hak akses penuh mengelola proctor dan kandidat</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-400">mail</span>
                                    <span className="text-sm">Notifikasi laporan ujian langsung ke email Anda</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 animate-fade-in">
                            <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Langkah 3 dari 3</span>
                            <h2 className="text-4xl font-extrabold leading-tight">Mulai Fleksibilitas Berlangganan</h2>
                            <p className="text-white/80 text-sm leading-relaxed">
                                Pilih paket sesuai volume asesmen Anda. Upgrade atau downgrade kapan saja tanpa biaya tambahan. Dapatkan kuota kandidat yang melimpah dan fitur proctoring AI yang andal.
                            </p>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 mt-6">
                                <h4 className="font-bold text-sm text-emerald-400">Ringkasan Paket Terpilih:</h4>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-sm font-semibold">{selectedPlan} Plan</span>
                                    <span className="text-sm font-extrabold text-white">
                                        {selectedPlan === "Free" && "Gratis"}
                                        {selectedPlan === "Starter" && `${formatCurrency(290000)} / bln`}
                                        {selectedPlan === "Business" && `${formatCurrency(750000)} / bln`}
                                    </span>
                                </div>
                                <div className="text-xs text-white/60 mt-2">
                                    * Untuk Starter dan Business, langganan aktif selama 30 hari dan pembayaran disimulasikan secara instan demi kenyamanan pendaftaran.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative z-10 text-xs text-white/50">
                    © {new Date().getFullYear()} SELEKSIA. All rights reserved.
                </div>
            </div>

            {/* Right Panel — Form Card */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[var(--color-bg-base)] transition-colors duration-300">
                <div className="w-full max-w-xl space-y-8 animate-slide-in-up">
                    
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center mb-4">
                        <img src="/full-logo.png" alt="SELEKSIA Logo" className="h-16 w-[220px] object-contain dark:brightness-0 dark:invert" />
                    </div>

                    <div className="bg-[var(--color-bg-card)] p-8 rounded-3xl border border-[var(--color-border)] shadow-[var(--shadow-card)] space-y-6 relative overflow-hidden">
                        <div className="card-shimmer" />

                        {/* Title and Stepper */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-extrabold text-[var(--color-text-main)] tracking-tight">
                                    Daftar Perusahaan Baru
                                </h1>
                                <a href="/" className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">arrow_back</span>
                                    Kembali ke Login
                                </a>
                            </div>

                            {/* Stepper bar */}
                            <div className="flex items-center gap-2 pt-2">
                                {[1, 2, 3].map((num) => (
                                    <div key={num} className="flex-1 flex items-center gap-2">
                                        <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                                            ${step === num 
                                                ? "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white scale-110 shadow-md"
                                                : step > num
                                                    ? "bg-[var(--color-primary)] text-white"
                                                    : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
                                            }`}
                                        >
                                            {step > num ? <span className="material-symbols-outlined text-sm">check</span> : num}
                                        </div>
                                        {num < 3 && (
                                            <div className={`flex-1 h-1 rounded-full transition-all duration-300
                                                ${step > num ? "bg-[var(--color-primary)]" : "bg-[var(--color-bg-elevated)]"}`} 
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/30 rounded-[var(--radius-sm)] animate-slide-in-up">
                                <span className="material-symbols-outlined text-[var(--color-danger)] text-xl flex-shrink-0 mt-0.5">error</span>
                                <p className="text-sm text-[var(--color-danger)] font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-6">
                            
                            {/* STEP 1: Company Profile */}
                            {step === 1 && (
                                <div className="space-y-5 animate-fade-in">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                            Nama Perusahaan / Organisasi
                                        </label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-xl group-focus-within:text-[var(--color-primary)] transition-colors">
                                                corporate_fare
                                            </span>
                                            <input
                                                type="text"
                                                value={companyName}
                                                onChange={handleCompanyNameChange}
                                                placeholder="Contoh: Nusantara Jaya Indonesia"
                                                className="w-full pl-11 pr-4 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-main)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                            Slug Subdomain (Unik)
                                        </label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-xl group-focus-within:text-[var(--color-primary)] transition-colors">
                                                link
                                            </span>
                                            <input
                                                type="text"
                                                value={companySlug}
                                                onChange={(e) => setCompanySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                                placeholder="nusantara-jaya"
                                                className="w-full pl-11 pr-32 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-main)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] transition-all font-mono"
                                                required
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
                                                .seleksia.com
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-[var(--color-text-sub)]">
                                            Tautan ini akan digunakan kandidat untuk masuk ke ujian. Hanya boleh huruf kecil, angka, dan strip (-).
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Administrator Profile */}
                            {step === 2 && (
                                <div className="space-y-5 animate-fade-in">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                            Nama Lengkap Administrator
                                        </label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-xl group-focus-within:text-[var(--color-primary)] transition-colors">
                                                badge
                                            </span>
                                            <input
                                                type="text"
                                                value={adminName}
                                                onChange={(e) => setAdminName(e.target.value)}
                                                placeholder="Contoh: Budi Santoso, M.Psi."
                                                className="w-full pl-11 pr-4 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-main)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                            Email Administrator
                                        </label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-xl group-focus-within:text-[var(--color-primary)] transition-colors">
                                                mail
                                            </span>
                                            <input
                                                type="email"
                                                value={adminEmail}
                                                onChange={(e) => setAdminEmail(e.target.value)}
                                                placeholder="admin@nama-perusahaan.com"
                                                className="w-full pl-11 pr-4 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-main)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                            Kata Sandi Akun
                                        </label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-xl group-focus-within:text-[var(--color-primary)] transition-colors">
                                                lock
                                            </span>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={adminPassword}
                                                onChange={(e) => setAdminPassword(e.target.value)}
                                                placeholder="Minimal 6 karakter"
                                                className="w-full pl-11 pr-12 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-main)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] transition-all"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-xl">
                                                    {showPassword ? "visibility_off" : "visibility"}
                                                </span>
                                            </button>
                                        </div>
                                        {/* Strength meter bar */}
                                        {adminPassword && (
                                            <div className="space-y-1 pt-1">
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-semibold text-[var(--color-text-sub)]">Kekuatan Sandi:</span>
                                                    <span className="font-bold text-[var(--color-text-main)]">{passwordStrength.text}</span>
                                                </div>
                                                <div className="w-full h-1 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${passwordStrength.color} transition-all duration-300`} 
                                                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Choose Plan */}
                            {step === 3 && (
                                <div className="space-y-5 animate-fade-in">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                        Pilih Paket Berlangganan Awal
                                    </label>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        
                                        {/* Plan Free */}
                                        <div 
                                            onClick={() => setSelectedPlan("Free")}
                                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between
                                                ${selectedPlan === "Free" 
                                                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-md translate-y-[-2px]" 
                                                    : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                                                }`}
                                        >
                                            <div className="space-y-2">
                                                <h3 className="font-extrabold text-sm text-[var(--color-text-main)]">Free</h3>
                                                <div className="text-lg font-black text-[var(--color-text-main)]">Rp 0</div>
                                                <p className="text-[10px] text-[var(--color-text-sub)] leading-tight">Cocok untuk mencoba sistem atau evaluasi skala kecil.</p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-sub)] space-y-1">
                                                <div>• Maks. 10 Kandidat</div>
                                                <div>• Maks. 3 Paket Tes</div>
                                                <div>• Fitur Proctoring AI Dasar</div>
                                            </div>
                                        </div>

                                        {/* Plan Starter */}
                                        <div 
                                            onClick={() => setSelectedPlan("Starter")}
                                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between
                                                ${selectedPlan === "Starter" 
                                                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-md translate-y-[-2px]" 
                                                    : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                                                }`}
                                        >
                                            <div className="space-y-2">
                                                <h3 className="font-extrabold text-sm text-[var(--color-text-main)]">Starter</h3>
                                                <div className="text-lg font-black text-[var(--color-text-main)]">Rp 290rb</div>
                                                <p className="text-[10px] text-[var(--color-text-sub)] leading-tight">Ideal untuk rekrutmen periodik UMKM & institusi lokal.</p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-sub)] space-y-1">
                                                <div>• Maks. 100 Kandidat</div>
                                                <div>• Maks. 10 Paket Tes</div>
                                                <div>• Realtime Webcam Monitoring</div>
                                            </div>
                                        </div>

                                        {/* Plan Business */}
                                        <div 
                                            onClick={() => setSelectedPlan("Business")}
                                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between
                                                ${selectedPlan === "Business" 
                                                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-md translate-y-[-2px]" 
                                                    : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                                                }`}
                                        >
                                            {/* Best Value badge */}
                                            <div className="absolute top-0 right-0 bg-gradient-to-l from-[var(--color-primary)] to-[var(--color-accent)] text-white text-[8px] font-black uppercase px-2 py-1 rounded-bl-lg">
                                                Populer
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="font-extrabold text-sm text-[var(--color-text-main)]">Business</h3>
                                                <div className="text-lg font-black text-[var(--color-text-main)]">Rp 750rb</div>
                                                <p className="text-[10px] text-[var(--color-text-sub)] leading-tight">Untuk perusahaan dengan aktivitas rekrutmen intensif.</p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-sub)] space-y-1">
                                                <div>• Maks. 1.000 Kandidat</div>
                                                <div>• Maks. 50 Paket Tes</div>
                                                <div>• Laporan Ekspor XLSX/PDF</div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--color-border)]">
                                {step > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => setStep(step - 1)}
                                        className="px-6 py-3 bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] font-bold text-xs rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-all btn-press"
                                    >
                                        Sebelumnya
                                    </button>
                                ) : (
                                    <div />
                                )}

                                {step < 3 ? (
                                    <button
                                        type="button"
                                        onClick={() => setStep(step + 1)}
                                        disabled={
                                            (step === 1 && (!companyName || !companySlug)) ||
                                            (step === 2 && (!adminName || !adminEmail || !adminPassword || adminPassword.length < 6))
                                        }
                                        className="px-6 py-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-xs rounded-[var(--radius-sm)] shadow-[var(--shadow-sm)] hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-press"
                                    >
                                        Selanjutnya
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="group px-6 py-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-xs rounded-[var(--radius-sm)] shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] transition-all relative overflow-hidden flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-shine btn-press cursor-pointer"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                Daftar & Berlangganan
                                                <span className="material-symbols-outlined text-xs">rocket_launch</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
