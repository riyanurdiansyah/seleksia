"use client";
import { globalDialog } from "@/app/providers/DialogProvider";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Breadcrumb from "../../components/Breadcrumb";
import Select2 from "../../components/Select2";

interface CandidateResult {
    id: string;
    name: string;
    displayId: string;
    phone: string;
    email: string;
    assignedTests: string;
    status: string;
}

export default function WhatsappClient({ initialData }: { initialData: CandidateResult[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [templateText, setTemplateText] = useState("Halo {{name}},\n\nAnda telah dijadwalkan untuk mengikuti psikotes: {{test_name}}.\n\nSilakan login menggunakan ID Anda: {{displayId}} melalui situs kami.\n\nTerima kasih.");
    const [search, setSearch] = useState("");

    // Sequential Wizard States
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardIndex, setWizardIndex] = useState(0);
    const [wizardStatuses, setWizardStatuses] = useState<Record<string, "pending" | "sent" | "skipped">>({});

    const selectedUserIds = useMemo(() => Array.from(selectedUsers), [selectedUsers]);

    // Multi-tenant States
    const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string>(searchParams.get("companyId") || "all");
    const [currentRole, setCurrentRole] = useState<string>("user");

    const fetchCompanies = useCallback(async () => {
        try {
            const res = await fetch("/api/companies");
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch (err) {
            console.error("Failed to fetch companies", err);
        }
    }, []);

    useEffect(() => {
        const role = localStorage.getItem("candidateRole") || "user";
        setCurrentRole(role);

        if (role === "superadmin") {
            fetchCompanies();
        }
    }, [fetchCompanies]);

    const handleCompanyChange = (val: string) => {
        setSelectedCompany(val);
        setSelectedUsers(new Set());
        setWizardStatuses({});
        router.push(`/communication/whatsapp?companyId=${val}`);
    };

    const filteredData = initialData.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.displayId.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.toLowerCase().includes(search.toLowerCase())
    );

    const toggleSelect = (id: string, phone: string) => {
        if (!phone) return; // Prevent selecting users without phone numbers
        const newSet = new Set(selectedUsers);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedUsers(newSet);
    };

    const toggleSelectAll = () => {
        const withPhones = filteredData.filter(d => d.phone);
        if (selectedUsers.size === withPhones.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(withPhones.map(d => d.id)));
        }
    };

    const insertVariable = (variable: string) => {
        setTemplateText(prev => prev + " " + variable);
    };

    const personalizeMessage = useCallback((user: CandidateResult, msg: string) => {
        return msg
            .replace(/\{\{name\}\}/g, user.name)
            .replace(/\{\{test_name\}\}/g, user.assignedTests || "Test Assessment")
            .replace(/\{\{displayId\}\}/g, user.displayId)
            .replace(/\{\{email\}\}/g, user.email);
    }, []);

    const formatPhoneNumber = (phone: string) => {
        if (!phone) return "";
        let formatted = phone.replace(/[^0-9]/g, ""); // Keep only numbers
        if (formatted.startsWith("0")) {
            formatted = "62" + formatted.substring(1); // Replace leading 0 with 62 (Indonesian standard)
        }
        return formatted;
    };

    const generateWhatsappLink = useCallback((user: CandidateResult) => {
        const text = encodeURIComponent(personalizeMessage(user, templateText));
        const phone = formatPhoneNumber(user.phone);
        return `https://wa.me/${phone}?text=${text}`;
    }, [templateText, personalizeMessage]);

    const handleSendIndividual = (user: CandidateResult) => {
        window.open(generateWhatsappLink(user), "_blank");
    };

    const startWizard = () => {
        if (selectedUserIds.length === 0) return;
        const initial: Record<string, "pending"> = {};
        selectedUserIds.forEach(id => {
            initial[id] = "pending";
        });
        setWizardStatuses(initial);
        setWizardIndex(0);
        setWizardOpen(true);
    };

    const handleWizardSend = async (user: CandidateResult) => {
        window.open(generateWhatsappLink(user), "_blank");
        setWizardStatuses(prev => ({ ...prev, [user.id]: "sent" }));
        if (wizardIndex < selectedUserIds.length - 1) {
            setWizardIndex(prev => prev + 1);
        } else {
            await globalDialog.alert("Semua pesan telah selesai diproses!");
            setWizardOpen(false);
            setSelectedUsers(new Set());
        }
    };

    const handleWizardSkip = async (userId: string) => {
        setWizardStatuses(prev => ({ ...prev, [userId]: "skipped" }));
        if (wizardIndex < selectedUserIds.length - 1) {
            setWizardIndex(prev => prev + 1);
        } else {
            await globalDialog.alert("Semua pesan telah selesai diproses!");
            setWizardOpen(false);
            setSelectedUsers(new Set());
        }
    };

    return (
        <div className="space-y-6 animate-slide-in-up">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight flex items-center gap-2">
                            WhatsApp Blast <span className="material-symbols-outlined text-green-500">campaign</span>
                        </h1>
                        <p className="text-sm text-[var(--color-text-sub)] mt-1 font-medium">Broadcast instructions or access information to candidates instantly via WhatsApp.</p>
                    </div>
                    <Breadcrumb />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Left Col: Target Select */}
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] flex flex-col h-[750px] relative overflow-hidden">
                    <div className="card-shimmer" />
                    <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-hover)]">
                        <h3 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-2">
                            Select Recipients
                            <span className="bg-[var(--color-primary-light)] text-primary text-xs px-2 py-0.5 rounded-full border border-[var(--color-border-accent)]">{selectedUsers.size} Selected</span>
                        </h3>
                    </div>

                    <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-text-muted)]">
                                <span className="material-symbols-outlined text-[18px]">search</span>
                            </span>
                            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search by name, ID, or phone..." className="w-full h-10 pl-9 pr-4 text-sm rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300 text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]" />
                        </div>
                        {currentRole === "superadmin" && (
                            <Select2
                                value={selectedCompany}
                                onChange={handleCompanyChange}
                                options={[
                                    { value: "all", label: "Semua Perusahaan" },
                                    ...companies.map(c => ({ value: c.id, label: c.name }))
                                ]}
                                placeholder="Pilih Perusahaan..."
                                className="w-52 text-left"
                            />
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="px-4 py-2 flex items-center">
                            <button onClick={toggleSelectAll} className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 btn-press">
                                <span className="material-symbols-outlined text-[16px]">{selectedUsers.size === filteredData.filter(d => d.phone).length && selectedUsers.size > 0 ? "check_box" : "check_box_outline_blank"}</span>
                                Select / Deselect All Valid
                            </button>
                        </div>
                        <div className="space-y-1 mt-1">
                            {filteredData.map(c => {
                                const hasPhone = !!c.phone;
                                const isSelected = selectedUsers.has(c.id);
                                const currentBlastState = wizardStatuses[c.id];

                                return (
                                    <div key={c.id} onClick={() => toggleSelect(c.id, c.phone)} className={`p-3 rounded-[var(--radius-sm)] flex items-center gap-4 transition-all cursor-pointer ${isSelected ? "bg-[var(--color-success-light)] border-[var(--color-success)]/20 border" : "bg-transparent border border-transparent hover:bg-[var(--color-bg-hover)]"}`}>
                                        <button className={`size-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${isSelected ? "bg-green-500 border-green-500 text-white" : !hasPhone ? "border-[var(--color-border)] bg-[var(--color-bg-hover)] cursor-not-allowed" : "border-[var(--color-border-strong)] bg-[var(--color-bg-card)]"}`}>
                                            {isSelected && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-[var(--color-text-main)] truncate">{c.name} <span className="font-normal text-[var(--color-text-muted)] text-xs ml-1">({c.displayId})</span></p>
                                            <p className={`text-xs mt-0.5 truncate ${hasPhone ? "text-[var(--color-text-sub)] font-mono" : "text-[var(--color-danger)] italic font-medium"}`}>{hasPhone ? c.phone : "No Phone Number Recorded"}</p>
                                        </div>

                                        {currentBlastState === "pending" && <span className="material-symbols-outlined text-[var(--color-warning)]">schedule</span>}
                                        {currentBlastState === "sent" && <span className="material-symbols-outlined text-[var(--color-success)]">check_circle</span>}
                                        {currentBlastState === "skipped" && <span className="material-symbols-outlined text-[var(--color-text-muted)]">block</span>}

                                        {hasPhone && (
                                            <button onClick={(e) => { e.stopPropagation(); handleSendIndividual(c); }} className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--color-success-light)] text-[var(--color-success)] hover:shadow-[0_2px_8px_var(--color-success-glow)] transition-all ml-auto btn-press" title="Send Individual WhatsApp Web">
                                                <span className="material-symbols-outlined text-[18px]">send</span>
                                            </button>
                                        )}
                                    </div>
                                )
                            })}

                            {filteredData.length === 0 && (
                                <p className="text-center py-6 text-sm text-[var(--color-text-sub)]">No candidates match your search.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Col: Editor & Preview */}
                <div className="flex flex-col gap-6">
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative overflow-hidden">
                        <div className="card-shimmer" />
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-[var(--color-text-main)]">Message Template</h3>
                            <button className="text-xs font-semibold text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] flex items-center gap-1 transition-colors btn-press">
                                <span className="material-symbols-outlined text-[16px]">help</span> Format Guide
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                            <button onClick={() => insertVariable("{{name}}")} className="px-2.5 py-1 rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] text-xs font-mono font-medium text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-all btn-press border border-[var(--color-border)]" title="Insert Candidate Name">+ {"{{name}}"}</button>
                            <button onClick={() => insertVariable("{{displayId}}")} className="px-2.5 py-1 rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] text-xs font-mono font-medium text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-all btn-press border border-[var(--color-border)]" title="Insert Login ID">+ {"{{displayId}}"}</button>
                            <button onClick={() => insertVariable("{{test_name}}")} className="px-2.5 py-1 rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] text-xs font-mono font-medium text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-main)] transition-all btn-press border border-[var(--color-border)]" title="Insert Assigned Tests">+ {"{{test_name}}"}</button>
                        </div>

                        <textarea
                            value={templateText}
                            onChange={(e) => setTemplateText(e.target.value)}
                            className="w-full h-48 p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm text-[var(--color-text-main)] resize-none font-sans placeholder-[var(--color-text-muted)]"
                            placeholder="Type your whatsapp message here..."
                        ></textarea>

                        <div className="mt-4 p-4 bg-[var(--color-accent-light)] rounded-[var(--radius-md)] border border-[var(--color-accent)]/20 flex items-start gap-3">
                            <span className="material-symbols-outlined text-[var(--color-accent)] mt-0.5">info</span>
                            <div>
                                <h4 className="text-sm font-semibold text-[var(--color-accent)]">Sistem Pengiriman wa.me</h4>
                                <p className="text-xs text-[var(--color-text-sub)] mt-1">
                                    Karena aplikasi ini dirancang sebagai platform SaaS, pengiriman pesan bulk dilakukan dengan mengarahkan pengguna secara manual dan berurutan menggunakan layanan tautan WhatsApp Web (`wa.me`). Hal ini menghindari penggunaan nomor WA sentral pihak ketiga.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-4 border-t border-[var(--color-border)] pt-6">
                            <button onClick={startWizard} disabled={selectedUsers.size === 0} className="flex-1 py-3 px-4 rounded-[var(--radius-sm)] bg-[#25D366] hover:bg-[#1da851] text-white font-bold text-sm transition-all shadow-md shadow-[#25D366]/20 hover:shadow-lg hover:shadow-[#25D366]/30 hover:translate-y-[-1px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-press">
                                <span className="material-symbols-outlined">campaign</span>
                                Mulai Kirim Berurutan ({selectedUsers.size})
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Sequential Sender Wizard Modal */}
            {wizardOpen && selectedUserIds.length > 0 && (() => {
                const currentId = selectedUserIds[wizardIndex];
                const currentUser = filteredData.find(c => c.id === currentId);
                if (!currentUser) return null;

                return (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4">
                        <div className="absolute inset-0" onClick={() => setWizardOpen(false)} />
                        <div className="relative w-full max-w-lg bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up flex flex-col p-6 space-y-5">
                            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-text-main)]">Kirim WhatsApp Web</h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">Kirim pesan manual berurutan dengan wa.me</p>
                                </div>
                                <button onClick={() => setWizardOpen(false)} className="p-1.5 rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold text-[var(--color-text-muted)]">
                                    <span>Pesan ke-{wizardIndex + 1} dari {selectedUserIds.length}</span>
                                    <span>{Math.round(((wizardIndex) / selectedUserIds.length) * 100)}% Selesai</span>
                                </div>
                                <div className="w-full bg-[var(--color-bg-elevated)] h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${((wizardIndex) / selectedUserIds.length) * 100}%` }} />
                                </div>
                            </div>

                            {/* Recipient card */}
                            <div className="p-4 bg-[var(--color-bg-hover)] rounded-xl border border-[var(--color-border)] space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--color-text-main)]">{currentUser.name}</h4>
                                        <p className="text-xs text-[var(--color-text-muted)] font-mono">{currentUser.phone}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${wizardStatuses[currentId] === "sent" ? "bg-green-100 text-green-800" : wizardStatuses[currentId] === "skipped" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                                        {wizardStatuses[currentId]}
                                    </span>
                                </div>
                                <div className="border-t border-[var(--color-border)] pt-2 mt-2">
                                    <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Preview Pesan:</p>
                                    <div className="bg-[var(--color-bg-elevated)] p-3 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-sub)] whitespace-pre-wrap font-sans mt-1 max-h-36 overflow-y-auto">
                                        {personalizeMessage(currentUser, templateText)}
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    onClick={() => handleWizardSkip(currentId)}
                                    className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] border border-[var(--color-border)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-all btn-press"
                                >
                                    Lewati
                                </button>
                                <button 
                                    onClick={() => handleWizardSend(currentUser)}
                                    className="flex-1 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[#25D366] hover:bg-[#1da851] text-white font-bold text-sm transition-all shadow-md shadow-[#25D366]/20 hover:shadow-lg flex items-center justify-center gap-2 btn-press"
                                >
                                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                    Kirim & Lanjut
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
