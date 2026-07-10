"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PaymentPage() {
    const [companyInfo, setCompanyInfo] = useState<{ name: string; plan: string; status: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [midtransConfig, setMidtransConfig] = useState<{ clientKey: string; mode: string } | null>(null);

    // Midtrans Settings Form State
    const [showKeyConfig, setShowKeyConfig] = useState(false);
    const [midtransClientKey, setMidtransClientKey] = useState("");
    const [midtransServerKey, setMidtransServerKey] = useState("");
    const [midtransMode, setMidtransMode] = useState("sandbox");
    const [isSavingKeys, setIsSavingKeys] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    // Mount and fetch subscription info
    useEffect(() => {
        fetchSubscription();
    }, []);

    // Load Midtrans Script dynamically once settings are resolved
    useEffect(() => {
        if (!midtransConfig) return;

        const { clientKey, mode } = midtransConfig;

        // Remove existing snap script if any
        const existingScript = document.getElementById("midtrans-snap");
        if (existingScript) existingScript.remove();

        const script = document.createElement("script");
        script.src = mode === "production"
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js";
        script.setAttribute("data-client-key", clientKey);
        script.id = "midtrans-snap";
        document.body.appendChild(script);

        return () => {
            const snapScript = document.getElementById("midtrans-snap");
            if (snapScript) snapScript.remove();
        };
    }, [midtransConfig]);

    const fetchSubscription = async () => {
        try {
            const res = await fetch("/api/subscription");
            if (res.ok) {
                const data = await res.json();
                setCompanyInfo({
                    name: data.companyName || "Perusahaan Anda",
                    plan: data.plan,
                    status: data.status,
                });
                
                setMidtransConfig({
                    clientKey: data.midtransClientKey || "",
                    mode: data.midtransMode || "sandbox"
                });

                // If already active, redirect to dashboard
                if (data.status === "active") {
                    window.location.href = "/dashboard";
                }
            } else {
                setError("Gagal memuat informasi tagihan.");
            }
        } catch {
            setError("Gagal menghubungkan ke server.");
        } finally {
            setIsLoading(false);
        }
    };

    // Load custom keys if they want to configure them
    const loadCustomKeys = async () => {
        try {
            const res = await fetch("/api/settings/midtrans");
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    setMidtransClientKey(result.data.midtransClientKey);
                    setMidtransServerKey(result.data.midtransServerKey);
                    setMidtransMode(result.data.midtransMode);
                }
            }
        } catch (err) {
            console.error("Failed to load custom keys:", err);
        }
    };

    useEffect(() => {
        if (showKeyConfig) {
            loadCustomKeys();
        }
    }, [showKeyConfig]);

    const handleSaveKeys = async () => {
        setIsSavingKeys(true);
        setSaveStatus(null);
        try {
            const res = await fetch("/api/settings/midtrans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    midtransServerKey,
                    midtransClientKey,
                    midtransMode
                })
            });
            const data = await res.json();
            if (data.success) {
                setSaveStatus({ type: "success", msg: "Kredensial Midtrans berhasil disimpan." });
                // Re-init snap script with correct mode
                const snapScript = document.getElementById("midtrans-snap");
                if (snapScript) snapScript.remove();
                
                const script = document.createElement("script");
                script.src = midtransMode === "production" 
                    ? "https://app.midtrans.com/snap/snap.js"
                    : "https://app.sandbox.midtrans.com/snap/snap.js";
                script.setAttribute("data-client-key", midtransClientKey);
                script.id = "midtrans-snap";
                document.body.appendChild(script);
            } else {
                setSaveStatus({ type: "error", msg: data.error || "Gagal menyimpan kredensial." });
            }
        } catch {
            setSaveStatus({ type: "error", msg: "Terjadi kesalahan jaringan." });
        } finally {
            setIsSavingKeys(false);
        }
    };

    const handlePayNow = async () => {
        setIsProcessing(true);
        setError("");
        setSuccessMessage("");

        try {
            const res = await fetch("/api/subscription/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isSimulation: false })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Gagal memulai pembayaran.");
                setIsProcessing(false);
                return;
            }

            // Trigger Midtrans Snap Popup
            const snap = (window as any).snap;
            if (!snap) {
                setError("Script Midtrans Snap belum selesai dimuat. Silakan coba lagi.");
                setIsProcessing(false);
                return;
            }

            snap.pay(data.token, {
                onSuccess: async function (result: any) {
                    setIsProcessing(true);
                    // Verify with backend
                    try {
                        const confirmRes = await fetch("/api/subscription/confirm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ orderId: result.order_id })
                        });
                        const confirmData = await confirmRes.json();
                        if (confirmData.success) {
                            setSuccessMessage("Pembayaran Berhasil! Mengalihkan ke dashboard...");
                            setTimeout(() => {
                                window.location.href = "/dashboard";
                            }, 1500);
                        } else {
                            setError(confirmData.message || "Gagal memverifikasi status pembayaran.");
                        }
                    } catch {
                        setError("Gagal menghubungi server untuk memverifikasi pembayaran.");
                    } finally {
                        setIsProcessing(false);
                    }
                },
                onPending: function () {
                    setError("Menunggu pembayaran Anda diselesaikan.");
                    setIsProcessing(false);
                },
                onError: function () {
                    setError("Terjadi kesalahan saat memproses pembayaran dengan Midtrans.");
                    setIsProcessing(false);
                },
                onClose: function () {
                    setError("Pembayaran dibatalkan.");
                    setIsProcessing(false);
                }
            });

        } catch {
            setError("Kesalahan koneksi ke gateway pembayaran.");
            setIsProcessing(false);
        }
    };

    const handleSimulatePayment = async () => {
        setIsProcessing(true);
        setError("");
        setSuccessMessage("");

        try {
            const res = await fetch("/api/subscription/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isSimulation: true })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setSuccessMessage("Simulasi Berhasil! Akun Anda telah diaktifkan.");
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 1500);
            } else {
                setError(data.error || "Gagal melakukan simulasi pembayaran.");
            }
        } catch {
            setError("Kesalahan jaringan.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        // Clear cookies via root redirect or direct logout helper if available, otherwise just clear session
        document.cookie = "companyId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        window.location.href = "/login";
    };

    const getPlanPrice = (plan: string) => {
        if (plan === "Starter") return "Rp 290.000";
        if (plan === "Business") return "Rp 750.000";
        return "Rp 0";
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-[var(--color-primary-light)] border-t-primary rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-[var(--color-text-muted)] font-medium">Memuat Tagihan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex font-sans bg-[var(--color-bg-base)] transition-colors duration-300 relative overflow-hidden">
            {/* Ambient background orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-radial-gradient from-primary/10 to-transparent pointer-events-none rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-radial-gradient from-accent/10 to-transparent pointer-events-none rounded-full blur-3xl" />

            <div className="w-full max-w-2xl mx-auto px-6 py-12 flex flex-col justify-center relative z-10 animate-slide-in-up">
                
                {/* Branding Logo */}
                <div className="flex items-center justify-center mb-8">
                    <img src="/full-logo.png" alt="SELEKSIA Logo" className="h-16 w-[220px] object-contain dark:brightness-0 dark:invert" />
                </div>

                <div className="bg-[var(--color-bg-card)] p-8 rounded-3xl border border-[var(--color-border)] shadow-[var(--shadow-card)] space-y-6 relative overflow-hidden">
                    <div className="card-shimmer" />

                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-emerald-500/10 text-primary border border-emerald-500/20 rounded-[24px] flex items-center justify-center mx-auto mb-4 animate-float">
                            <span className="material-symbols-outlined text-3xl">payments</span>
                        </div>
                        <h1 className="text-2xl font-black text-[var(--color-text-main)] tracking-tight">
                            Menunggu Aktivasi Paket
                        </h1>
                        <p className="text-sm text-[var(--color-text-sub)]">
                            Perusahaan <strong>{companyInfo?.name}</strong> berhasil terdaftar. Selesaikan pembayaran paket untuk mulai menggunakan dashboard.
                        </p>
                    </div>

                    {/* Bill details card */}
                    <div className="p-5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] space-y-3.5">
                        <div className="flex justify-between items-center text-sm font-semibold">
                            <span className="text-[var(--color-text-sub)]">Paket Terpilih:</span>
                            <span className="bg-primary-light text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {companyInfo?.plan} Plan
                            </span>
                        </div>
                        <div className="h-px bg-[var(--color-border)]" />
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-[var(--color-text-sub)]">Total Tagihan (30 Hari):</span>
                            <span className="text-2xl font-black text-[var(--color-text-main)] tracking-tight">
                                {getPlanPrice(companyInfo?.plan || "")}
                            </span>
                        </div>
                    </div>

                    {/* Status Feedback Messages */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/30 rounded-[var(--radius-sm)] animate-slide-in-up">
                            <span className="material-symbols-outlined text-[var(--color-danger)] text-xl flex-shrink-0 mt-0.5">error</span>
                            <p className="text-xs text-[var(--color-danger)] font-semibold leading-relaxed">{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-[var(--radius-sm)] animate-slide-in-up">
                            <span className="material-symbols-outlined text-green-650 text-xl flex-shrink-0 mt-0.5">check_circle</span>
                            <p className="text-xs text-green-650 font-semibold leading-relaxed">{successMessage}</p>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            onClick={handlePayNow}
                            disabled={isProcessing}
                            className="group w-full py-3.5 bg-gradient-to-br from-primary to-accent hover:shadow-[0_8px_25px_var(--color-primary-glow)] hover:scale-[1.01] text-white font-extrabold text-sm rounded-[var(--radius-sm)] transition-all flex items-center justify-center gap-2 cursor-pointer btn-press btn-shine disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Menghubungkan Midtrans...
                                </>
                            ) : (
                                <>
                                    Bayar Sekarang (Midtrans)
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleSimulatePayment}
                            disabled={isProcessing}
                            className="w-full py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-strong)] text-[var(--color-text-main)] font-bold text-xs rounded-[var(--radius-sm)] transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Simulasi Uji Coba (Aktifkan Gratis)
                        </button>

                        <div className="flex justify-between items-center text-xs pt-4 border-t border-[var(--color-border)]">
                            <button onClick={handleLogout} className="text-[var(--color-text-muted)] hover:text-red-500 font-bold transition-colors">
                                Keluar & Daftar Ulang
                            </button>
                            <button 
                                onClick={() => setShowKeyConfig(!showKeyConfig)}
                                className="text-[var(--color-primary)] hover:underline font-bold transition-all"
                            >
                                {showKeyConfig ? "Sembunyikan Pengaturan Keys" : "Gunakan Akun Midtrans Sendiri (Optional)"}
                            </button>
                        </div>
                    </div>

                    {/* Toggleable Inline Keys Configuration */}
                    {showKeyConfig && (
                        <div className="border-t border-[var(--color-border)] pt-5 mt-4 space-y-4 animate-fade-in">
                            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-main)]">
                                Konfigurasi Kredensial Midtrans Perusahaan
                            </h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                                Masukkan Client Key dan Server Key Midtrans Anda sendiri untuk menampung transaksi pembayaran langsung ke akun Anda.
                            </p>

                            <div className="space-y-3.5">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                                        Midtrans Client Key *
                                    </label>
                                    <input
                                        value={midtransClientKey}
                                        onChange={(e) => setMidtransClientKey(e.target.value)}
                                        className="w-full h-9 px-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary outline-none transition-all"
                                        placeholder="SB-Mid-client-XXXXXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                                        Midtrans Server Key *
                                    </label>
                                    <input
                                        value={midtransServerKey}
                                        onChange={(e) => setMidtransServerKey(e.target.value)}
                                        type="password"
                                        className="w-full h-9 px-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary outline-none transition-all"
                                        placeholder="SB-Mid-server-YYYYYY"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                                        Environment Mode
                                    </label>
                                    <div className="flex gap-4 pt-1">
                                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[var(--color-text-main)]">
                                            <input 
                                                type="radio" 
                                                name="inlineMode" 
                                                value="sandbox" 
                                                checked={midtransMode === "sandbox"}
                                                onChange={() => setMidtransMode("sandbox")}
                                                className="accent-primary"
                                            />
                                            Sandbox
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[var(--color-text-main)]">
                                            <input 
                                                type="radio" 
                                                name="inlineMode" 
                                                value="production" 
                                                checked={midtransMode === "production"}
                                                onChange={() => setMidtransMode("production")}
                                                className="accent-primary"
                                            />
                                            Production
                                        </label>
                                    </div>
                                </div>

                                {saveStatus && (
                                    <div className={`p-2.5 rounded-lg text-[10px] font-semibold flex items-center gap-2 ${
                                        saveStatus.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                                    }`}>
                                        <span className="material-symbols-outlined text-[16px]">
                                            {saveStatus.type === "success" ? "check_circle" : "error"}
                                        </span>
                                        {saveStatus.msg}
                                    </div>
                                )}

                                <button
                                    onClick={handleSaveKeys}
                                    disabled={isSavingKeys || !midtransClientKey || !midtransServerKey}
                                    className="px-4 py-2 bg-gradient-to-br from-primary to-accent text-white font-bold text-xs rounded-lg transition-all btn-press btn-shine disabled:opacity-50"
                                >
                                    {isSavingKeys ? "Menyimpan..." : "Simpan Kredensial"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
