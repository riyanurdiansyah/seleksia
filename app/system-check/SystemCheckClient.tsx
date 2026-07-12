"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type CheckStatus = "pending" | "checking" | "passed" | "failed";

interface CheckItem {
    id: string;
    label: string;
    icon: string;
    status: CheckStatus;
    detail: string;
}

export default function SystemCheckClient() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    const [checks, setChecks] = useState<CheckItem[]>([
        {
            id: "internet",
            label: "Koneksi Internet",
            icon: "wifi",
            status: "pending",
            detail: "Menunggu...",
        },
        {
            id: "camera",
            label: "Akses Kamera",
            icon: "videocam",
            status: "pending",
            detail: "Menunggu...",
        },
        {
            id: "battery",
            label: "Daya Baterai",
            icon: "battery_full",
            status: "pending",
            detail: "Menunggu...",
        },
        {
            id: "browser",
            label: "Kecocokan Browser",
            icon: "public",
            status: "pending",
            detail: "Menunggu...",
        },
    ]);

    const allPassed = checks.every((c) => c.status === "passed");
    const hasFailed = checks.some((c) => c.status === "failed");

    const updateCheck = useCallback(
        (id: string, update: Partial<CheckItem>) => {
            setChecks((prev) =>
                prev.map((c) => (c.id === id ? { ...c, ...update } : c))
            );
        },
        []
    );

    useEffect(() => {
        const runChecks = async () => {
            // 1. Internet check
            updateCheck("internet", { status: "checking", detail: "Mengecek..." });
            await delay(800);
            const online = navigator.onLine;
            updateCheck("internet", {
                status: online ? "passed" : "failed",
                detail: online ? "Koneksi stabil" : "Tidak ada koneksi",
            });

            // 2. Browser check
            updateCheck("browser", { status: "checking", detail: "Mengecek..." });
            await delay(600);
            const ua = navigator.userAgent;
            const browserName = ua.includes("Chrome")
                ? "Chrome"
                : ua.includes("Firefox")
                    ? "Firefox"
                    : ua.includes("Safari")
                        ? "Safari"
                        : "Browser";
            updateCheck("browser", {
                status: "passed",
                detail: `${browserName} (Didukung)`,
            });

            // 3. Battery check
            updateCheck("battery", { status: "checking", detail: "Mengecek..." });
            await delay(700);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const battery = await (navigator as any).getBattery?.();
                if (battery) {
                    const level = Math.round(battery.level * 100);
                    const charging = battery.charging;
                    updateCheck("battery", {
                        status: level > 20 || charging ? "passed" : "failed",
                        detail: charging
                            ? `Terhubung listrik (${level}%)`
                            : `Baterai ${level}%${level <= 20 ? " — Lemah!" : ""}`,
                    });
                } else {
                    updateCheck("battery", {
                        status: "passed",
                        detail: "Status tidak didukung — OK",
                    });
                }
            } catch {
                updateCheck("battery", {
                    status: "passed",
                    detail: "Tidak terdeteksi — OK",
                });
            }

            // 4. Camera check
            updateCheck("camera", {
                status: "checking",
                detail: "Meminta izin...",
            });
            await delay(500);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                setCameraStream(stream);
                updateCheck("camera", {
                    status: "passed",
                    detail: "Kamera aktif",
                });
            } catch {
                updateCheck("camera", {
                    status: "failed",
                    detail: "Akses ditolak atau diblokir",
                });
            }
        };

        runChecks();

        return () => {
            // Cleanup camera on unmount
            cameraStream?.getTracks().forEach((t) => t.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Attach camera stream to video element
    useEffect(() => {
        if (videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream]);

    return (
        <>
            {/* Main card */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-card)] border border-[var(--color-border)] overflow-hidden animate-slide-in-up relative">
                <div className="p-6 sm:p-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Checklist */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-[var(--color-text-main)] flex items-center gap-2">
                                <span className="material-symbols-outlined text-brand-teal">
                                    checklist
                                </span>
                                Persyaratan Sistem
                            </h3>

                            <div className="space-y-4">
                                {checks.map((item, i) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[var(--color-bg-hover)] hover:translate-y-[-1px]"
                                    >

                                        <div className="flex items-center gap-4">
                                            <StatusIcon status={item.status} icon={item.icon} />
                                            <div>
                                                <p className="font-semibold text-[var(--color-text-main)]">
                                                    {item.label}
                                                </p>
                                                <p
                                                    className={`text-xs mt-0.5 font-medium ${item.status === "passed"
                                                        ? "text-[var(--color-success)]"
                                                        : item.status === "failed"
                                                            ? "text-danger"
                                                            : "text-[var(--color-text-sub)]"
                                                        }`}
                                                >
                                                    {item.detail}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pl-4">
                                            <StatusBadge status={item.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Camera Preview */}
                        <div className="space-y-6 flex flex-col h-full">
                            <h3 className="text-lg font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                <span className="material-symbols-outlined text-brand-teal">
                                    visibility
                                </span>
                                Pratinjau Kamera
                            </h3>

                            <div className="relative w-full flex-grow min-h-[250px] bg-slate-900 rounded-[var(--radius-sm)] overflow-hidden">

                                {cameraStream ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover transition-opacity duration-1000"
                                    />
                                ) : (
                                    <div
                                        className="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-3"
                                        style={{
                                            backgroundImage:
                                                "radial-gradient(circle at center, rgba(30, 41, 59, 1) 0%, rgba(15, 23, 42, 1) 100%)",
                                        }}
                                    >
                                        <span className="material-symbols-outlined text-5xl animate-pulse text-[var(--color-text-sub)]">
                                            videocam_off
                                        </span>
                                        <p className="text-sm font-medium tracking-wide">
                                            {checks.find((c) => c.id === "camera")?.status === "failed"
                                                ? "KAMERA TERBLOKIR"
                                                : "MEMINTA IZIN AKSES..."}
                                        </p>
                                    </div>
                                )}

                                {/* REC indicator */}
                                {cameraStream && (
                                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                                        <div className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs font-medium text-white flex items-center gap-2">
                                            <div className="size-2 bg-[var(--color-danger)] rounded-full animate-pulse" />
                                            REC
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info box */}
                            <div className="bg-[var(--color-primary-light)] border border-[var(--color-border-accent)] p-4 rounded-[var(--radius-md)] flex gap-3">
                                <span className="material-symbols-outlined text-primary flex-shrink-0">
                                    lightbulb
                                </span>
                                <p className="text-sm text-primary leading-relaxed font-semibold">
                                    Pastikan wajah Anda terlihat jelas dan berada di tengah bingkai kamera. Hindari cahaya yang terlalu terang dari belakang (backlight).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="px-6 py-4 sm:px-8 bg-[var(--color-bg-elevated)] border-t border-[var(--color-border)] flex justify-between sm:justify-end gap-3 rounded-b-[var(--radius-md)]">
                    <button className="px-5 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-sub)] font-medium text-sm hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-all duration-200 cursor-pointer btn-press">
                        Bantuan
                    </button>

                    {allPassed ? (
                        <Link
                            href="/instructions"
                            className="flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-bold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press btn-shine"
                        >
                            Lanjutkan
                            <span className="material-symbols-outlined text-sm">
                                arrow_forward
                            </span>
                        </Link>
                    ) : (
                        <button
                            disabled
                            className="flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] font-bold text-sm cursor-not-allowed opacity-75"
                        >
                            {hasFailed ? "Coba Lagi" : "Lanjutkan"}
                            <span className="material-symbols-outlined text-sm">
                                arrow_forward
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

/* ===== Helper Components ===== */

function StatusIcon({ status, icon }: { status: CheckStatus; icon: string }) {
    const colors = {
        pending: "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]",
        checking: "bg-[var(--color-primary-light)] text-primary",
        passed: "bg-[var(--color-success-light)] text-[var(--color-success)] shadow-[0_0_12px_var(--color-success-glow)]",
        failed: "bg-[var(--color-danger-light)] text-danger shadow-[0_0_12px_var(--color-danger-glow)]",
    };

    return (
        <div
            className={`size-10 rounded-full flex items-center justify-center ${colors[status]}`}
        >
            <span className="material-symbols-outlined">{icon}</span>
        </div>
    );
}

function StatusBadge({ status }: { status: CheckStatus }) {
    if (status === "checking") {
        return (
            <div className="animate-spin size-5 border-2 border-primary border-t-transparent rounded-full" />
        );
    }
    if (status === "passed") {
        return (
            <span className="material-symbols-outlined text-[var(--color-success)] text-xl">
                check_circle
            </span>
        );
    }
    if (status === "failed") {
        return (
            <span className="material-symbols-outlined text-danger text-xl">
                cancel
            </span>
        );
    }
    return (
        <span className="material-symbols-outlined text-[var(--color-text-muted)] text-xl">
            radio_button_unchecked
        </span>
    );
}

function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}
