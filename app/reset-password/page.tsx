"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Tautan tidak valid. Token reset password tidak ditemukan.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Kata sandi dan konfirmasi kata sandi tidak cocok.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Kata sandi harus minimal 6 karakter.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Gagal mereset kata sandi.");
                setLoading(false);
                return;
            }

            setSuccess(true);
        } catch (err) {
            setError("Kesalahan jaringan. Periksa koneksi Anda.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-sans bg-[var(--color-bg-base)]">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#1A3C40] via-[#0c5c64] to-[#059669] relative overflow-hidden flex-col justify-between p-16">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                <div className="relative z-10 flex items-center">
                    <img src="/full-logo.png" alt="SELEKSIA Logo" className="h-16 w-[220px] object-contain brightness-0 invert" style={{ filter: "brightness(0) invert(1)" }} />
                </div>
                <div className="relative z-10 max-w-xl my-auto space-y-8">
                    <h2 className="text-4xl font-extrabold leading-[1.15] text-white tracking-tight">
                        Buat Sandi <span className="text-white/80">Baru</span>
                    </h2>
                    <p className="text-white/80 text-base leading-relaxed max-w-lg">
                        Silakan buat kata sandi baru untuk akun Anda. Pastikan untuk membuat sandi yang kuat dan mudah Anda ingat.
                    </p>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-8 lg:p-16 relative overflow-y-auto">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h1 className="text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">
                            Kata Sandi Baru
                        </h1>
                        <p className="text-[var(--color-text-muted)] mt-2">
                            Masukkan kata sandi baru Anda di bawah ini.
                        </p>
                    </div>

                    {success ? (
                        <div className="bg-[var(--color-success-light)] border border-[var(--color-success)] text-[var(--color-success)] px-4 py-3 rounded-lg flex items-start gap-3">
                            <span className="material-symbols-outlined mt-0.5">check_circle</span>
                            <div>
                                <h3 className="font-bold text-sm">Sukses!</h3>
                                <p className="text-xs mt-1">Kata sandi Anda telah berhasil diubah. Silakan masuk menggunakan kata sandi baru Anda.</p>
                                <a href="/login" className="inline-block mt-4 px-6 py-2 bg-[var(--color-success)] text-white text-sm font-bold rounded-md hover:opacity-90">Ke Halaman Login</a>
                            </div>
                        </div>
                    ) : !token ? (
                        <div className="bg-[var(--color-danger-light)] border border-[var(--color-danger)] text-[var(--color-danger)] px-4 py-3 rounded-lg flex items-start gap-3">
                            <span className="material-symbols-outlined mt-0.5">error</span>
                            <div>
                                <h3 className="font-bold text-sm">Token Tidak Valid</h3>
                                <p className="text-xs mt-1">Tautan reset password ini tidak valid atau tidak lengkap. Silakan minta tautan baru dari halaman Lupa Password.</p>
                                <a href="/forgot-password" className="inline-block mt-4 text-sm font-bold underline hover:text-[var(--color-danger-dark)]">Minta Tautan Baru</a>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-[var(--color-danger-light)] border border-[var(--color-danger)] text-[var(--color-danger)] px-4 py-3 rounded-[var(--radius-sm)] flex items-center gap-3 text-sm animate-fade-in-up">
                                    <span className="material-symbols-outlined">error</span>
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                                        Kata Sandi Baru
                                    </label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-xl z-10 transition-colors duration-200 group-focus-within:text-[var(--color-primary)]">
                                            lock
                                        </span>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                                            placeholder="Minimal 6 karakter"
                                            className="w-full pl-11 pr-12 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-main)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-xl">
                                                {showPassword ? "visibility_off" : "visibility"}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                                        Konfirmasi Kata Sandi
                                    </label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--color-text-muted)] text-xl z-10 transition-colors duration-200 group-focus-within:text-[var(--color-primary)]">
                                            lock_reset
                                        </span>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                                            placeholder="Ketik ulang kata sandi"
                                            className="w-full pl-11 pr-12 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-main)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !newPassword || !confirmPassword}
                                className="group w-full py-3.5 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-sm rounded-[var(--radius-sm)] shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] active:translate-y-0 transition-all duration-200 btn-shine btn-press relative overflow-hidden flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        Simpan Sandi Baru
                                        <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                                            save
                                        </span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
