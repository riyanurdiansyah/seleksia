"use client";

import { useState, useEffect } from "react";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Breadcrumb from "../components/Breadcrumb";

interface Plan {
    id: string;
    name: string;
    price: number;
    priceText: string | null;
    maxCandidates: number;
    maxTests: number;
    features: string[];
    isPopular: boolean;
    sortOrder: number;
}

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<Partial<Plan>>({ features: [] });
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/plans");
            if (res.ok) {
                const data = await res.json();
                setPlans(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = currentPlan.id ? `/api/plans/${currentPlan.id}` : "/api/plans";
            const method = currentPlan.id ? "PUT" : "POST";
            
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentPlan),
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchPlans();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const res = await fetch(`/api/plans/${deleteId}`, { method: "DELETE" });
            if (res.ok) {
                setIsConfirmOpen(false);
                fetchPlans();
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <Breadcrumb
                items={[
                    { label: "Dashboard", href: "/admin" },
                    { label: "Paket Langganan" }
                ]}
            />

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Paket Langganan</h1>
                <button
                    onClick={() => {
                        setCurrentPlan({ features: [], maxCandidates: 0, maxTests: 0, sortOrder: 0, price: 0, isPopular: false });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Tambah Paket
                </button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div key={plan.id} className={`p-6 bg-white border rounded-xl relative ${plan.isPopular ? 'border-primary shadow-lg shadow-primary/10' : 'border-gray-200 shadow-sm'}`}>
                            {plan.isPopular && (
                                <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">
                                    TERPOPULER
                                </div>
                            )}
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                            <div className="text-3xl font-extrabold text-gray-900 mb-6">
                                {plan.priceText || `Rp ${plan.price.toLocaleString('id-ID')}`}
                            </div>
                            
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-3 text-sm text-gray-600">
                                    <span className="material-symbols-outlined text-green-500 text-lg">check</span>
                                    {plan.maxCandidates > 0 ? `Maksimal ${plan.maxCandidates} Kandidat` : 'Kandidat Tidak Terbatas'}
                                </li>
                                <li className="flex items-center gap-3 text-sm text-gray-600">
                                    <span className="material-symbols-outlined text-green-500 text-lg">check</span>
                                    {plan.maxTests > 0 ? `Maksimal ${plan.maxTests} Paket Ujian` : 'Paket Ujian Tidak Terbatas'}
                                </li>
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                                        <span className="material-symbols-outlined text-green-500 text-lg">check</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <div className="flex gap-2 mt-auto">
                                <button
                                    onClick={() => { setCurrentPlan(plan); setIsModalOpen(true); }}
                                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => { setDeleteId(plan.id); setIsConfirmOpen(true); }}
                                    className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentPlan.id ? "Edit Paket" : "Tambah Paket"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Nama Paket</label>
                            <input type="text" required value={currentPlan.name || ""} onChange={(e) => setCurrentPlan({...currentPlan, name: e.target.value})} className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm text-[var(--color-text-main)]" placeholder="e.g. Starter Plan" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Teks Harga (Opsional)</label>
                            <input type="text" value={currentPlan.priceText || ""} onChange={(e) => setCurrentPlan({...currentPlan, priceText: e.target.value})} className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm text-[var(--color-text-main)]" placeholder="e.g. Rp 290rb / bulan" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Harga (Angka)</label>
                            <input type="number" required value={currentPlan.price || 0} onChange={(e) => setCurrentPlan({...currentPlan, price: Number(e.target.value)})} className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm text-[var(--color-text-main)]" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Sort Order</label>
                            <input type="number" value={currentPlan.sortOrder || 0} onChange={(e) => setCurrentPlan({...currentPlan, sortOrder: Number(e.target.value)})} className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm text-[var(--color-text-main)]" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Max Kandidat (0 = Unlimited)</label>
                            <input type="number" required value={currentPlan.maxCandidates || 0} onChange={(e) => setCurrentPlan({...currentPlan, maxCandidates: Number(e.target.value)})} className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm text-[var(--color-text-main)]" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Max Ujian (0 = Unlimited)</label>
                            <input type="number" required value={currentPlan.maxTests || 0} onChange={(e) => setCurrentPlan({...currentPlan, maxTests: Number(e.target.value)})} className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm text-[var(--color-text-main)]" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Fitur Tambahan (Pisahkan dengan koma)</label>
                        <textarea 
                            value={currentPlan.features?.join(", ") || ""} 
                            onChange={(e) => setCurrentPlan({...currentPlan, features: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} 
                            className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm text-[var(--color-text-main)] h-24" 
                            placeholder="Proctoring AI, Ekspor PDF, Custom Domain..." 
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="isPopular" checked={currentPlan.isPopular || false} onChange={(e) => setCurrentPlan({...currentPlan, isPopular: e.target.checked})} className="mt-0.5 size-4 rounded border-[var(--color-border)] text-primary focus:ring-[var(--color-primary-light)] cursor-pointer" />
                        <label htmlFor="isPopular" className="text-sm font-medium text-[var(--color-text-sub)]">Tandai sebagai Terpopuler</label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-all font-medium text-sm btn-press">Batal</button>
                        <button type="submit" className="px-4 py-2 bg-gradient-to-br from-primary to-accent text-white rounded-[var(--radius-sm)] font-bold text-sm shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] transition-all btn-press btn-shine">Simpan</button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={isConfirmOpen}
                title="Hapus Paket"
                message="Apakah Anda yakin ingin menghapus paket langganan ini? Tindakan ini tidak dapat dibatalkan."
                onConfirm={handleDelete}
                onCancel={() => setIsConfirmOpen(false)}
            />
        </div>
    );
}
