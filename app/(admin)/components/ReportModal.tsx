"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReportModal({ isOpen, onClose }: ReportModalProps) {
    const [category, setCategory] = useState("bug");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [reporterName, setReporterName] = useState("");
    const [reporterEmail, setReporterEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submittedSuccess, setSubmittedSuccess] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen || typeof document === "undefined") return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            return setError("Subjek dan rincian laporan wajib diisi.");
        }

        setSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category,
                    subject,
                    message,
                    reporterName,
                    reporterEmail,
                }),
            });

            if (res.ok) {
                setSubmittedSuccess(true);
                setTimeout(() => {
                    setSubmittedSuccess(false);
                    setSubject("");
                    setMessage("");
                    onClose();
                }, 2000);
            } else {
                const data = await res.json();
                setError(data.error || "Gagal mengirimkan laporan.");
            }
        } catch (err) {
            console.error("Report submit error:", err);
            setError("Terjadi kesalahan koneksi saat mengirim laporan.");
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative animate-slide-in-up">
                
                {/* Close Button */}
                {!submitting && (
                    <button
                        onClick={onClose}
                        className="absolute right-5 top-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                )}

                {/* Header */}
                <div className="bg-gradient-to-br from-[#1A3C40] to-[#0c5c64] p-6 text-white">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <span className="material-symbols-outlined text-base">support_agent</span>
                        Bantuan & Dukungan Tim Seleksia
                    </div>
                    <h3 className="text-xl font-black">Kirim Laporan / Feedback</h3>
                    <p className="text-xs text-emerald-100/80 mt-1">Punya kendala teknis, pertanyaan tagihan, atau masukan fitur? Sampaikan langsung ke tim kami.</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {submittedSuccess ? (
                        <div className="py-10 text-center space-y-3 animate-scale-up">
                            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 mx-auto flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                            </div>
                            <h4 className="text-lg font-bold text-[var(--color-text-main)]">Laporan Berhasil Terkirim!</h4>
                            <p className="text-xs text-[var(--color-text-sub)]">Terima kasih. Tim Seleksia akan segera menindaklanjuti laporan Anda.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-xs text-red-600 dark:text-red-300 font-semibold">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] mb-1.5">
                                    Kategori Laporan *
                                </label>
                                <select
                                    className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)] outline-none focus:border-primary"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="bug">🐛 Kendala Teknis / Bug</option>
                                    <option value="feature_request">💡 Usulan Fitur Baru</option>
                                    <option value="billing">💳 Tagihan & Pembayaran</option>
                                    <option value="general">❓ Pertanyaan Umum</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] mb-1.5">
                                    Judul / Subjek *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Error saat mengunduh hasil laporan ujian"
                                    className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none focus:border-primary"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-main)] mb-1.5">
                                    Rincian Pesan / Kendala *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Jelaskan secara rinci kendala atau masukan yang Anda alami..."
                                    className="w-full p-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none focus:border-primary"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--color-text-sub)] mb-1">Nama Anda (Opsional)</label>
                                    <input
                                        type="text"
                                        placeholder="Nama pelapor"
                                        className="w-full h-9 px-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] outline-none focus:border-primary"
                                        value={reporterName}
                                        onChange={(e) => setReporterName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--color-text-sub)] mb-1">Email Kontak (Opsional)</label>
                                    <input
                                        type="email"
                                        placeholder="email@domain.com"
                                        className="w-full h-9 px-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] outline-none focus:border-primary"
                                        value={reporterEmail}
                                        onChange={(e) => setReporterEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-[var(--color-bg-elevated)] border-t border-[var(--color-border)] flex items-center justify-end gap-3 rounded-b-2xl mt-4">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-text-sub)] hover:text-[var(--color-text-main)]"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-xs shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 btn-press cursor-pointer"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Mengirim...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-base">send</span>
                                            <span>Kirim Laporan</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
