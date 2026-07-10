"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface UsageMetric {
    current: number;
    limit: number;
}

interface SubscriptionData {
    plan: string;
    status: string;
    startedAt: string | null;
    expiresAt: string | null;
    usage: {
        candidates: UsageMetric;
        tests: UsageMetric;
    };
    payments: Array<{
        id: string;
        plan: string;
        amount: number;
        status: string;
        paymentMethod: string | null;
        createdAt: string;
    }>;
}

interface RBACAccess {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

export default function SubscriptionDashboard() {
    const [subData, setSubData] = useState<SubscriptionData | null>(null);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [access, setAccess] = useState<RBACAccess>({
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false
    });

    // Modal & payment state
    const [showModal, setShowModal] = useState(false);
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<{ name: string; price: number } | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentStep, setPaymentStep] = useState(1); // 1: Initial screen, 3: Success
    const [paymentError, setPaymentError] = useState("");
    const [isSnapOpen, setIsSnapOpen] = useState(false);

    const fetchSubscriptionData = async () => {
        try {
            const [res, plansRes] = await Promise.all([
                fetch("/api/subscription"),
                fetch("/api/plans")
            ]);
            
            if (res.ok) {
                const data = await res.json();
                setSubData(data);
            } else {
                setError("Gagal memuat informasi langganan.");
            }

            if (plansRes.ok) {
                const plansData = await plansRes.json();
                setAvailablePlans(plansData);
            }
        } catch (err) {
            setError("Gagal memuat data langganan.");
        } finally {
            setLoading(false);
        }
    };

    // Payment processing logic is now handled via direct redirect to DOKU.

    // Load dynamic Midtrans Snap SDK based on Global System settings from .env
    useEffect(() => {
        if (!subData) return;

        const clientKey = (subData as any).midtransClientKey || "";
        const mode = (subData as any).midtransMode || "sandbox";

        try {
            // Remove existing Midtrans script if any
            const existingScript = document.getElementById("midtrans-snap");
            if (existingScript) existingScript.remove();

            const script = document.createElement("script");
            script.src = mode === "production"
                ? "https://app.midtrans.com/snap/snap.js"
                : "https://app.sandbox.midtrans.com/snap/snap.js";
            script.setAttribute("data-client-key", clientKey);
            script.id = "midtrans-snap";
            document.body.appendChild(script);
        } catch (err) {
            console.error("Gagal memuat script Midtrans:", err);
        }

        // Load DOKU Checkout JS SDK
        try {
            const dokuMode = (subData as any).dokuMode || "sandbox";
            const existingDokuScript = document.getElementById("doku-jokul-checkout");
            if (existingDokuScript) existingDokuScript.remove();

            const dokuScript = document.createElement("script");
            dokuScript.src = dokuMode === "production"
                ? "https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"
                : "https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js";
            dokuScript.id = "doku-jokul-checkout";
            document.body.appendChild(dokuScript);
        } catch (err) {
            console.error("Gagal memuat script DOKU:", err);
        }

        return () => {
            const snapScript = document.getElementById("midtrans-snap");
            if (snapScript) snapScript.remove();
            
            const dokuScript = document.getElementById("doku-jokul-checkout");
            if (dokuScript) dokuScript.remove();
        };
    }, [subData]);

    useEffect(() => {
        const checkAccess = async () => {
            const role = sessionStorage.getItem("candidateRole") || "user";
            try {
                const accessRes = await fetch(`/api/rbac/check?path=/subscription&role=${role}`);
                if (accessRes.ok) {
                    const accessData = await accessRes.json();
                    setAccess(accessData);
                    
                    if (accessData.canRead) {
                        await fetchSubscriptionData();
                    } else {
                        setLoading(false);
                    }
                } else {
                    setError("Gagal memvalidasi hak akses (RBAC).");
                    setLoading(false);
                }
            } catch (err) {
                console.error("RBAC Check error:", err);
                setError("Gagal melakukan inisialisasi keamanan.");
                setLoading(false);
            }
        };

        checkAccess();
    }, []);

    const handleUpgradeClick = (planName: string, price: number) => {
        setSelectedUpgradePlan({ name: planName, price });
        setPaymentStep(1);
        setPaymentError("");
        setIsSnapOpen(false);
        setShowModal(true);
    };

    const handlePayNow = async () => {
        if (!selectedUpgradePlan) return;
        setIsProcessingPayment(true);
        setPaymentError("");

        try {
            const res = await fetch("/api/subscription/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan: selectedUpgradePlan.name,
                    isSimulation: false
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setPaymentError(data.error || "Gagal memulai pembayaran.");
                setIsProcessingPayment(false);
                return;
            }

            if (data.redirectUrl) {
                // Trigger DOKU Checkout Popup
                const loadJokulCheckout = (window as any).loadJokulCheckout;
                if (!loadJokulCheckout) {
                    setPaymentError("Script DOKU belum selesai dimuat. Silakan coba lagi atau periksa koneksi Anda.");
                    setIsProcessingPayment(false);
                    return;
                }

                setIsSnapOpen(true);
                loadJokulCheckout(data.redirectUrl);
                
                // Note: DOKU Checkout JS does not have built-in on-close callbacks like Midtrans.
                // We rely on the user closing the modal or the webhook redirecting them back to this page.
                // Since it's a popup overlay, the page will just wait until the overlay redirects or closes.
                // But DOKU JS might actually redirect the parent window upon success, or the user clicks "Back to Merchant".
                // If we want to safely reset state after some time, we can leave it as is or reset on focus.
                setIsProcessingPayment(false);

            } else {
                setPaymentError("URL pembayaran tidak ditemukan dari server.");
                setIsProcessingPayment(false);
            }

        } catch (err) {
            setPaymentError("Kesalahan koneksi ke gateway pembayaran.");
            setIsProcessingPayment(false);
        }
    };

    const handlePayNowMidtrans = async () => {
        if (!selectedUpgradePlan) return;
        setIsProcessingPayment(true);
        setPaymentError("");

        try {
            const res = await fetch("/api/subscription/pay-midtrans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan: selectedUpgradePlan.name,
                    isSimulation: false
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setPaymentError(data.error || "Gagal memulai pembayaran.");
                setIsProcessingPayment(false);
                return;
            }

            // Trigger Midtrans Snap Popup
            const snap = (window as any).snap;
            if (!snap) {
                setPaymentError("Script Midtrans Snap belum selesai dimuat. Silakan coba lagi.");
                setIsProcessingPayment(false);
                return;
            }

            setIsSnapOpen(true);
            snap.pay(data.token, {
                onSuccess: function (result: any) {
                    setIsSnapOpen(false);
                    // Usually you don't need to manually verify with backend here if you have Webhook running
                    // But for immediate UI feedback we can just show success or refresh
                    setPaymentStep(3); // success
                    fetchSubscriptionData(); // refresh data
                },
                onPending: function () {
                    setIsSnapOpen(false);
                    setPaymentError("Menunggu pembayaran Anda diselesaikan.");
                    setIsProcessingPayment(false);
                },
                onError: function () {
                    setIsSnapOpen(false);
                    setPaymentError("Terjadi kesalahan saat memproses pembayaran dengan Midtrans.");
                    setIsProcessingPayment(false);
                },
                onClose: function () {
                    setIsSnapOpen(false);
                    setPaymentError("Pembayaran dibatalkan.");
                    setIsProcessingPayment(false);
                }
            });

        } catch (err) {
            setPaymentError("Kesalahan koneksi ke gateway pembayaran.");
            setIsProcessingPayment(false);
        }
    };

    const handleSimulatePayment = async () => {
        if (!selectedUpgradePlan) return;
        setIsProcessingPayment(true);
        setPaymentError("");

        try {
            const res = await fetch("/api/subscription/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan: selectedUpgradePlan.name,
                    isSimulation: true
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setPaymentStep(3); // success
                fetchSubscriptionData(); // refresh data
            } else {
                setPaymentError(data.error || "Gagal melakukan simulasi pembayaran.");
            }
        } catch (err) {
            setPaymentError("Koneksi gagal. Silakan coba lagi.");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <div className="size-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[var(--color-text-sub)] font-medium">Memuat data langganan...</p>
            </div>
        );
    }

    if (!access.canRead) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <span className="material-symbols-outlined text-6xl text-[var(--color-danger)] mb-4">lock</span>
                <h2 className="text-xl font-bold text-[var(--color-text-main)]">Akses Ditolak</h2>
                <p className="text-[var(--color-text-sub)] mt-2">Anda tidak memiliki izin untuk melihat halaman ini berdasarkan Role Access Matrix (RBAC).</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/20 rounded-2xl flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--color-danger)]">error</span>
                <p className="text-sm text-[var(--color-danger)] font-semibold">{error}</p>
            </div>
        );
    }

    const currentPlan = subData?.plan || "Free";
    const candidatesUsage = subData?.usage.candidates || { current: 0, limit: 10 };
    const testsUsage = subData?.usage.tests || { current: 0, limit: 3 };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">Langganan Perusahaan</h1>
                    <p className="text-sm text-[var(--color-text-sub)]">Kelola plan billing, monitor kuota penggunaan peserta, dan tingkatkan paket asesmen CBT Anda.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--color-primary)]">verified</span>
                    <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider bg-[var(--color-primary-light)] px-3 py-1.5 rounded-full border border-[var(--color-border-accent)]/20">
                        Keamanan Terjamin
                    </span>
                </div>
            </div>

            {/* Top Cards: Plan Overview & Usage Meters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Card 1: Active Plan Summary */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-6 shadow-[var(--shadow-card)] space-y-6 relative overflow-hidden">
                    <div className="card-shimmer" />
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Plan Aktif</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h2 className="text-3xl font-black text-[var(--color-text-main)]">{currentPlan}</h2>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                                ${subData?.status === "active" ? "bg-[var(--color-success-light)] text-[var(--color-success)]" : "bg-[var(--color-danger-light)] text-[var(--color-danger)]"}`}>
                                {subData?.status === "active" ? "Aktif" : "Kadaluarsa"}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3.5 pt-2 border-t border-[var(--color-border)]">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-[var(--color-text-sub)]">Dimulai Pada:</span>
                            <span className="font-semibold text-[var(--color-text-main)]">{formatDate(subData?.startedAt || null)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-[var(--color-text-sub)]">Masa Berlaku S/D:</span>
                            <span className="font-semibold text-[var(--color-text-main)]">
                                {currentPlan === "Free" ? "Selamanya (Gratis)" : formatDate(subData?.expiresAt || null)}
                            </span>
                        </div>
                        {currentPlan !== "Free" && subData?.expiresAt && (
                            <div className="text-[10px] text-[var(--color-text-muted)] italic flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">info</span>
                                * Tagihan otomatis akan jatuh tempo pada akhir masa aktif.
                            </div>
                        )}
                    </div>
                </div>

                {/* Card 2: Candidates Usage Progress */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-6 shadow-[var(--shadow-card)] space-y-5 flex flex-col justify-between relative overflow-hidden">
                    <div className="card-shimmer" />
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Kuota Kandidat</span>
                            <span className="text-xs font-bold text-[var(--color-text-main)]">
                                {candidatesUsage.current} / {candidatesUsage.limit >= 99999 ? "∞" : candidatesUsage.limit}
                            </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-sub)]">Jumlah kandidat aktif yang dapat didaftarkan di portal ujian.</p>
                    </div>

                    <div className="space-y-2">
                        {/* Custom Progress bar */}
                        <div className="w-full h-3.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden p-0.5 border border-[var(--color-border)]">
                            <div 
                                className={`h-full rounded-full transition-all duration-500
                                    ${(candidatesUsage.current / candidatesUsage.limit) >= 0.85 
                                        ? "bg-gradient-to-r from-orange-500 to-red-500" 
                                        : "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]"
                                    }`}
                                style={{ width: `${Math.min((candidatesUsage.current / candidatesUsage.limit) * 100, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-[var(--color-text-muted)]">
                            <span>0%</span>
                            <span>{Math.round(Math.min((candidatesUsage.current / candidatesUsage.limit) * 100, 100))}% Pemakaian</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Tests Usage Progress */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-6 shadow-[var(--shadow-card)] space-y-5 flex flex-col justify-between relative overflow-hidden">
                    <div className="card-shimmer" />
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Kuota Paket Ujian</span>
                            <span className="text-xs font-bold text-[var(--color-text-main)]">
                                {testsUsage.current} / {testsUsage.limit >= 99999 ? "∞" : testsUsage.limit}
                            </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-sub)]">Jumlah paket ujian CBT psikologi yang dapat dipublikasikan.</p>
                    </div>

                    <div className="space-y-2">
                        {/* Custom Progress bar */}
                        <div className="w-full h-3.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden p-0.5 border border-[var(--color-border)]">
                            <div 
                                className={`h-full rounded-full transition-all duration-500
                                    ${(testsUsage.current / testsUsage.limit) >= 0.85 
                                        ? "bg-gradient-to-r from-orange-500 to-red-500" 
                                        : "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]"
                                    }`}
                                style={{ width: `${Math.min((testsUsage.current / testsUsage.limit) * 100, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-[var(--color-text-muted)]">
                            <span>0%</span>
                            <span>{Math.round(Math.min((testsUsage.current / testsUsage.limit) * 100, 100))}% Pemakaian</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Plans Pricing Grid for Upgrading */}
            <div className="space-y-5">
                <div>
                    <h3 className="text-xl font-bold text-[var(--color-text-main)]">Tingkatkan Paket Anda</h3>
                    <p className="text-xs text-[var(--color-text-sub)]">Upgrade instan ke paket yang lebih tinggi untuk menambah limit kandidat dan ujian.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {availablePlans.map((plan) => {
                        const isCurrentPlan = currentPlan === plan.name;
                        // Basic logic to determine if it's an upgrade or downgrade for the button
                        // In a real app, this should compare sortOrder or price
                        const isHigherPlan = plan.price > (availablePlans.find(p => p.name === currentPlan)?.price || 0);

                        return (
                            <div key={plan.id} className={`bg-[var(--color-bg-card)] border rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300
                                ${isCurrentPlan 
                                    ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-md" 
                                    : plan.isPopular
                                        ? "border-[var(--color-primary-mid)] border-2 shadow-[0_12px_40px_rgba(5,150,105,0.06)] hover:border-[var(--color-primary)] hover:shadow-xl"
                                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:shadow-lg"
                                }`}
                            >
                                {isCurrentPlan && (
                                    <div className="absolute top-0 right-0 bg-[var(--color-primary)] text-white text-[9px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                                        Plan Aktif
                                    </div>
                                )}
                                {!isCurrentPlan && plan.isPopular && (
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-[var(--color-primary)] to-[var(--color-accent)] text-white text-[9px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest">
                                        Terpopuler
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-[var(--color-text-main)]">{plan.name} Plan</h4>
                                        <p className="text-xs text-[var(--color-text-sub)] mt-1">
                                            {plan.name === "Starter" ? "Ideal untuk rekrutmen skala kecil dan periodik." :
                                             plan.name === "Business" ? "Sempurna untuk aktivitas evaluasi rutin industri." :
                                             "Solusi custom untuk skala besar nasional."}
                                        </p>
                                    </div>
                                    <div className="flex items-baseline gap-1 pt-2">
                                        <span className={`font-black text-[var(--color-text-main)] ${plan.price === 0 ? 'text-2xl' : 'text-3xl'}`}>
                                            {plan.priceText || (plan.price === 0 ? 'Custom' : `Rp ${(plan.price / 1000)}rb`)}
                                        </span>
                                        {plan.price > 0 && <span className="text-xs text-[var(--color-text-sub)]">/ bulan</span>}
                                    </div>
                                    <ul className="space-y-2.5 text-xs text-[var(--color-text-sub)] pt-4 border-t border-[var(--color-border)]">
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm text-[var(--color-primary)]">check</span> 
                                            {plan.maxCandidates > 0 ? `Maksimal ${plan.maxCandidates.toLocaleString('id-ID')} Kandidat` : 'Kandidat Tidak Terbatas'}
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm text-[var(--color-primary)]">check</span> 
                                            {plan.maxTests > 0 ? `Maksimal ${plan.maxTests} Paket Ujian` : 'Paket Ujian Tidak Terbatas'}
                                        </li>
                                        {plan.features.map((feature: string, idx: number) => (
                                            <li key={idx} className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm text-[var(--color-primary)]">check</span> 
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                {plan.price === 0 ? (
                                    <a
                                        href="https://wa.me/6281234567890?text=Halo%20Seleksia%20saya%20tertarik%20dengan%20paket%20Enterprise"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full mt-6 py-3.5 rounded-[var(--radius-sm)] bg-[var(--color-brand-navy)] hover:bg-[#0f2427] text-white font-bold text-xs text-center block transition-all btn-press shadow-sm"
                                    >
                                        Hubungi Kami
                                    </a>
                                ) : (
                                    <button
                                        onClick={() => handleUpgradeClick(plan.name, plan.price)}
                                        disabled={isCurrentPlan || !isHigherPlan || !access.canUpdate}
                                        className={`w-full mt-6 py-3.5 rounded-[var(--radius-sm)] font-bold text-xs transition-all btn-press
                                            ${isCurrentPlan 
                                                ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] cursor-not-allowed border border-[var(--color-border)]"
                                                : !isHigherPlan
                                                    ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] cursor-not-allowed opacity-50"
                                                    : !access.canUpdate
                                                        ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] cursor-not-allowed border border-[var(--color-border)] opacity-60"
                                                        : "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white hover:shadow-[0_4px_15px_var(--color-primary-glow)]"
                                            }`}
                                    >
                                        {isCurrentPlan 
                                            ? "Aktif" 
                                            : (!isHigherPlan 
                                                ? "Downgrade Melalui Kontak" 
                                                : !access.canUpdate 
                                                    ? "Tidak Ada Izin Upgrade" 
                                                    : "Pilih Paket"
                                              )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Invoices Payment History */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-xl font-bold text-[var(--color-text-main)]">Riwayat Tagihan & Pembayaran</h3>
                    <p className="text-xs text-[var(--color-text-sub)]">Lihat riwayat transaksi billing dan cetak kwitansi pembayaran langganan Anda.</p>
                </div>

                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-[var(--shadow-card)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
                                    <th className="p-4 pl-6">Tanggal Transaksi</th>
                                    <th className="p-4">ID Invoice</th>
                                    <th className="p-4">Paket</th>
                                    <th className="p-4">Nominal</th>
                                    <th className="p-4">Metode Pembayaran</th>
                                    <th className="p-4 pr-6">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-sub)]">
                                {!subData?.payments || subData.payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-[var(--color-text-muted)] italic">
                                            Belum ada riwayat transaksi pembayaran.
                                        </td>
                                    </tr>
                                ) : (
                                    subData.payments.map((pay) => (
                                        <tr key={pay.id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                                            <td className="p-4 pl-6 font-medium text-[var(--color-text-main)]">{formatDate(pay.createdAt)}</td>
                                            <td className="p-4 font-mono text-[10px] uppercase text-[var(--color-text-muted)]">{pay.id}</td>
                                            <td className="p-4"><span className="font-semibold text-[var(--color-text-main)]">{pay.plan}</span></td>
                                            <td className="p-4 font-bold text-[var(--color-text-main)]">{formatCurrency(pay.amount)}</td>
                                            <td className="p-4 font-medium">{pay.paymentMethod || "-"}</td>
                                            <td className="p-4 pr-6">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                                    ${pay.status === "success" 
                                                        ? "bg-[var(--color-success-light)] text-[var(--color-success)]" 
                                                        : pay.status === "pending"
                                                            ? "bg-[var(--color-warning-light)] text-[var(--color-warning)]"
                                                            : "bg-[var(--color-danger-light)] text-[var(--color-danger)]"
                                                    }`}
                                                >
                                                    {pay.status === "success" ? "Sukses" : pay.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PREMIUM UPGRADE & PAYMENT MODAL */}
            {showModal && selectedUpgradePlan && typeof document !== "undefined" && createPortal((
                <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in transition-all duration-300 ${
                    isSnapOpen ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}>
                    <div className={`bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative animate-slide-in-up transition-all duration-300 ${
                        isSnapOpen ? "scale-95" : "scale-100"
                    }`}>
                        
                        {/* Close button */}
                        {!isProcessingPayment && paymentStep < 3 && (
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setIsSnapOpen(false);
                                }}
                                className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        )}
                                                {/* Modal Header */}
                        <div className="bg-gradient-to-br from-[#1A3C40] to-[#0c5c64] p-6 text-white">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Payment Gateway DOKU</span>
                            <h3 className="text-xl font-extrabold mt-1">Upgrade ke {selectedUpgradePlan.name} Plan</h3>
                            <div className="mt-4 flex justify-between items-baseline border-t border-white/10 pt-4">
                                <span className="text-xs text-white/75">Total Tagihan (30 Hari):</span>
                                <span className="text-2xl font-black text-white">{formatCurrency(selectedUpgradePlan.price)}</span>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            {/* Step 1: Payment Selection */}
                            {paymentStep === 1 && !isProcessingPayment && (
                                <div className="space-y-5">
                                    <div className="text-xs text-[var(--color-text-sub)]">
                                        Anda akan melakukan peningkatan ke paket <strong className="text-[var(--color-text-main)]">{selectedUpgradePlan.name} Plan</strong>. Pilih metode pembayaran di bawah untuk melanjutkan:
                                    </div>

                                    {/* Benefits list */}
                                    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-4 rounded-2xl space-y-2.5 text-xs">
                                        <div className="font-bold text-[var(--color-text-main)] mb-1">Fitur yang didapatkan:</div>
                                        {selectedUpgradePlan.name === "Starter" ? (
                                            <>
                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[var(--color-primary)] text-sm">check_circle</span> Maksimal 100 Kandidat aktif</div>
                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[var(--color-primary)] text-sm">check_circle</span> Maksimal 10 Paket Ujian CBT</div>
                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[var(--color-primary)] text-sm">check_circle</span> Live Monitoring Webcam</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[var(--color-primary)] text-sm">check_circle</span> Maksimal 1.000 Kandidat aktif</div>
                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[var(--color-primary)] text-sm">check_circle</span> Maksimal 50 Paket Ujian CBT</div>
                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[var(--color-primary)] text-sm">check_circle</span> AI Proctoring (Tab, Device, Face Lock)</div>
                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[var(--color-primary)] text-sm">check_circle</span> Ekspor PDF Laporan & Analitik</div>
                                            </>
                                        )}
                                    </div>

                                    {paymentError && (
                                        <div className="flex items-start gap-3 p-4 bg-[var(--color-danger-light)] border border-[var(--color-danger)]/30 rounded-2xl animate-fade-in">
                                            <span className="material-symbols-outlined text-[var(--color-danger)] text-lg flex-shrink-0 mt-0.5">error</span>
                                            <p className="text-xs text-[var(--color-danger)] font-semibold leading-relaxed">{paymentError}</p>
                                        </div>
                                    )}

                                    <div className="space-y-3 pt-2">
                                        {(((subData as any)?.activePaymentGateway || "both") === "doku" || ((subData as any)?.activePaymentGateway || "both") === "both") && (
                                            <button
                                                onClick={handlePayNow}
                                                className="w-full py-3.5 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] hover:shadow-lg text-white font-extrabold text-sm rounded-[var(--radius-sm)] transition-all cursor-pointer text-center flex items-center justify-center gap-2 btn-press"
                                            >
                                                <span className="material-symbols-outlined text-lg">payment</span>
                                                Bayar Sekarang (DOKU)
                                            </button>
                                        )}

                                        {(((subData as any)?.activePaymentGateway || "both") === "midtrans" || ((subData as any)?.activePaymentGateway || "both") === "both") && (
                                            <button
                                                onClick={handlePayNowMidtrans}
                                                className="w-full py-3.5 bg-gradient-to-br from-[#0c5c64] to-[#1A3C40] hover:shadow-lg text-white font-extrabold text-sm rounded-[var(--radius-sm)] transition-all cursor-pointer text-center flex items-center justify-center gap-2 btn-press"
                                            >
                                                <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                                                Bayar Sekarang (Midtrans)
                                            </button>
                                        )}

                                        <button
                                            onClick={handleSimulatePayment}
                                            className="w-full py-3 bg-transparent hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-text-sub)] font-bold text-xs rounded-[var(--radius-sm)] transition-all cursor-pointer text-center flex items-center justify-center gap-2 btn-press"
                                        >
                                            <span className="material-symbols-outlined text-base">science</span>
                                            Simulasi Bayar Instan (Uji Coba)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Processing Screen */}
                            {isProcessingPayment && (
                                <div className="py-12 flex flex-col items-center justify-center gap-4 text-center animate-fade-in">
                                    <div className="size-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                                    <div className="space-y-1">
                                        <h4 className="font-extrabold text-sm text-[var(--color-text-main)]">Menghubungi Payment Gateway...</h4>
                                        <p className="text-[11px] text-[var(--color-text-sub)]">Harap tunggu, sistem sedang memverifikasi transaksi pembayaran Anda.</p>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Success Screen */}
                            {paymentStep === 3 && (
                                <div className="py-8 flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
                                    <div className="size-16 rounded-full bg-[var(--color-success-light)] border border-[var(--color-success)]/20 flex items-center justify-center text-[var(--color-success)] shadow-inner">
                                        <span className="material-symbols-outlined text-4xl animate-bounce">check</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="text-xl font-extrabold text-[var(--color-text-main)]">Peningkatan Plan Berhasil!</h4>
                                        <p className="text-xs text-[var(--color-text-sub)]">
                                            Pembayaran sukses terverifikasi. Akun perusahaan Anda telah ditingkatkan menjadi <strong>{selectedUpgradePlan.name} Plan</strong>.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="px-8 py-3.5 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-xs rounded-[var(--radius-sm)] shadow-md transition-all btn-press cursor-pointer"
                                    >
                                        Kembali ke Dashboard
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ), document.body)}
        </div>
    );
}
