"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

interface TourStep {
    title: string;
    icon: string;
    color: string;
    path: string;
    description: string;
    highlights: string[];
}

const TOUR_STEPS: TourStep[] = [
    {
        title: "Selamat Datang di Seleksia!",
        icon: "waving_hand",
        color: "from-teal-600 to-cyan-600",
        path: "/dashboard",
        description: "Seleksia adalah platform Computer Based Test (CBT) & Asesmen Psikotes Online modern berbasis AI untuk mempercepat proses seleksi karyawan dan evaluasi SDM.",
        highlights: [
            "Otomatisasi kalkulasi skor psikotes",
            "Laporan Psikogram & Personality Insight AI",
            "Keamanan ujian anti-curang (Camera & Tab Monitoring)"
        ]
    },
    {
        title: "Dashboard Overview & Kuota",
        icon: "space_dashboard",
        color: "from-blue-600 to-indigo-600",
        path: "/dashboard",
        description: "Halaman ini adalah pusat kendali Anda. Pantau statistik peserta, aktivitas ujian aktif, dan sisa kuota langganan Anda secara real-time.",
        highlights: [
            "Monitor total kuota kandidat & paket ujian",
            "Lihat aktivitas kandidat yang sedang ujian",
            "Lihat grafik statistik skor peserta"
        ]
    },
    {
        title: "Manajemen Kandidat",
        icon: "groups",
        color: "from-purple-600 to-indigo-600",
        path: "/exam/candidate",
        description: "Tempat Anda mengelola data peserta ujian. Anda dapat mendaftarkan kandidat satu per satu atau mengimpor data sekaligus dari file Excel / CSV.",
        highlights: [
            "Fitur Import Kandidat masal via Excel",
            "Pengelompokan kandidat per batch rekrutmen",
            "Generasi otomatis ID Akses & Password peserta"
        ]
    },
    {
        title: "Paket Ujian & Bank Soal",
        icon: "quiz",
        color: "from-emerald-600 to-teal-600",
        path: "/exam/question",
        description: "Kelola bank soal dan buat modul ujian psikotes. Mendukung berbagai tipe soal seperti Skala Likert, Pilihan Ganda (MCQ), True/False, Essay AI, dan Seri Angka.",
        highlights: [
            "Pembuat Soal otomatis berbasis Claude AI",
            "Dukungan Skala Likert 1-5 & Kategori Kepribadian",
            "Pengacak urutan soal & pilihan jawaban"
        ]
    },
    {
        title: "Penugasan Ujian (Assignment)",
        icon: "rocket_launch",
        color: "from-orange-500 to-amber-600",
        path: "/exam/assignment",
        description: "Tugaskan paket ujian yang telah dibuat ke kandidat. Atur tanggal mulai, durasi ujian, serta metode distribusi akun peserta.",
        highlights: [
            "Pengiriman undangan otomatis via Email & WhatsApp",
            "Pengaturan jadwal akses & batas waktu pengerjaan",
            "Fitur cetak kartu peserta / token ujian"
        ]
    },
    {
        title: "Hasil Ujian & Laporan Psikogram",
        icon: "analytics",
        color: "from-[#1A3C40] to-[#0c5c64]",
        path: "/histories/result",
        description: "Lihat hasil ujian peserta secara instan. Sistem akan menghitung skor akhir, merekap log kecurangan, dan menganalisis profil kepribadian.",
        highlights: [
            "Laporan hasil rinci & grafik radar kompetensi",
            "Analisis kepribadian otomatis dari AI Corporate Psychologist",
            "Ekspor hasil ujian ke format PDF / Excel"
        ]
    },
    {
        title: "Langganan & Monitoring Kuota",
        icon: "credit_card",
        color: "from-purple-900 to-indigo-950",
        path: "/subscription",
        description: "Pantau penggunaan paket langganan Anda dan tingkatkan limit kuota (Starter, Business, Enterprise) secara langsung via Payment Gateway.",
        highlights: [
            "Metode pembayaran instan via Mayar Gateway",
            "Monitoring riwayat invoice & pembayaran",
            "Upgrade paket tanpa mengganggu data yang ada"
        ]
    }
];

interface OnboardingTourProps {
    isOpen?: boolean;
    onClose?: () => void;
    forceShow?: boolean;
}

export default function OnboardingTour({ isOpen: externalIsOpen, onClose, forceShow = false }: OnboardingTourProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (forceShow || externalIsOpen) {
            setIsOpen(true);
            return;
        }

        // Check DB onboarding status on mount
        checkOnboardingStatus();
    }, [externalIsOpen, forceShow]);

    const checkOnboardingStatus = async () => {
        try {
            const res = await fetch("/api/auth/onboarding");
            if (res.ok) {
                const data = await res.json();
                // Show tour only if user has NOT completed onboarding and role is admin/superadmin/proctor
                if (!data.hasCompletedOnboarding && (data.role === "admin" || data.role === "superadmin" || data.role === "proctor")) {
                    setIsOpen(true);
                }
            }
        } catch (err) {
            console.error("Failed to check onboarding status:", err);
        }
    };

    const markCompletedInDB = async () => {
        setSaving(true);
        try {
            await fetch("/api/auth/onboarding", { method: "POST" });
        } catch (err) {
            console.error("Failed to save onboarding completion:", err);
        } finally {
            setSaving(false);
            setIsOpen(false);
            if (onClose) onClose();
        }
    };

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            markCompletedInDB();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        markCompletedInDB();
    };

    if (!isOpen || typeof document === "undefined") return null;

    const step = TOUR_STEPS[currentStep];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative animate-slide-in-up flex flex-col justify-between min-h-[480px]">
                
                {/* Header Banner */}
                <div className={`bg-gradient-to-r ${step.color} p-8 text-white relative overflow-hidden transition-all duration-500`}>
                    <div className="absolute -right-8 -bottom-8 opacity-20 pointer-events-none">
                        <span className="material-symbols-outlined text-9xl">{step.icon}</span>
                    </div>

                    <div className="relative z-10 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                                Langkah {currentStep + 1} dari {TOUR_STEPS.length}
                            </span>
                            <button
                                onClick={handleSkip}
                                className="text-xs font-bold text-white/80 hover:text-white underline transition-colors cursor-pointer"
                            >
                                Lewati Panduan
                            </button>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                                <span className="material-symbols-outlined text-3xl">{step.icon}</span>
                            </div>
                            <h3 className="text-2xl font-black tracking-tight">{step.title}</h3>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                        <p className="text-sm text-[var(--color-text-main)] leading-relaxed font-medium">
                            {step.description}
                        </p>

                        <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)] block">
                                Keunggulan & Fitur Utama:
                            </span>
                            <ul className="space-y-2">
                                {step.highlights.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--color-text-sub)]">
                                        <span className="material-symbols-outlined text-primary text-base flex-shrink-0 mt-0.5">check_circle</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Footer Progress & Actions */}
                    <div className="pt-6 border-t border-[var(--color-border)] flex items-center justify-between">
                        {/* Step Dots */}
                        <div className="flex items-center gap-1.5">
                            {TOUR_STEPS.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentStep(idx)}
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        idx === currentStep
                                            ? "w-6 bg-primary"
                                            : "w-2 bg-[var(--color-border-strong)] hover:bg-primary/50"
                                    }`}
                                    title={`Langkah ${idx + 1}`}
                                />
                            ))}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-2">
                            {currentStep > 0 && (
                                <button
                                    onClick={handleBack}
                                    disabled={saving}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-text-sub)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                                >
                                    Kembali
                                </button>
                            )}

                            <button
                                onClick={handleNext}
                                disabled={saving}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold text-xs shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center gap-1.5 btn-press cursor-pointer disabled:opacity-50"
                            >
                                {saving ? (
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>{currentStep === TOUR_STEPS.length - 1 ? "Selesai Panduan" : "Lanjut"}</span>
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
