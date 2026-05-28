"use client";

import { useState } from "react";

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
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [templateText, setTemplateText] = useState("Halo {{name}},\n\nAnda telah dijadwalkan untuk mengikuti psikotes: {{test_name}}.\n\nSilakan login menggunakan ID Anda: {{displayId}} melalui situs kami.\n\nTerima kasih.");
    const [isBlasting, setIsBlasting] = useState(false);
    const [blastStatus, setBlastStatus] = useState<{ id: string, status: "pending" | "success" | "failed" }[]>([]);
    const [search, setSearch] = useState("");

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
        setTemplateText(prev => prev + variable);
    };

    // Replace variables in text for a specific user
    const personalizeMessage = (user: CandidateResult, msg: string) => {
        return msg
            .replace(/\{\{name\}\}/g, user.name)
            .replace(/\{\{test_name\}\}/g, user.assignedTests || "Test Assessment")
            .replace(/\{\{displayId\}\}/g, user.displayId)
            .replace(/\{\{email\}\}/g, user.email);
    };

    const formatPhoneNumber = (phone: string) => {
        if (!phone) return "";
        let formatted = phone.replace(/[^0-9]/g, ""); // Keep only numbers
        if (formatted.startsWith("0")) {
            formatted = "62" + formatted.substring(1); // Replace leading 0 with 62 (Indonesian standard)
        }
        return formatted;
    };

    const generateWhatsappLink = (user: CandidateResult) => {
        const text = encodeURIComponent(personalizeMessage(user, templateText));
        const phone = formatPhoneNumber(user.phone);
        return `https://wa.me/${phone}?text=${text}`;
    };

    const handleSendIndividual = (user: CandidateResult) => {
        window.open(generateWhatsappLink(user), "_blank");
    };

    const handleBlast = async () => {
        if (selectedUsers.size === 0) return;
        setIsBlasting(true);

        const initialStatuses = Array.from(selectedUsers).map(id => ({ id, status: "pending" as const }));
        setBlastStatus(initialStatuses);

        // Simulate a blast process (batching typical for actual API delivery)
        for (let i = 0; i < initialStatuses.length; i++) {
            const userStatus = initialStatuses[i];

            // Artificial delay to mimic API request
            await new Promise(r => setTimeout(r, 800));

            setBlastStatus(prev => prev.map(s => s.id === userStatus.id ? { ...s, status: "success" } : s));
        }

        setIsBlasting(false);
    };

    return (
        <div className="space-y-6 animate-slide-in-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight flex items-center gap-2">
                        WhatsApp Blast <span className="material-symbols-outlined text-green-500">campaign</span>
                    </h1>
                    <p className="text-sm text-[var(--color-text-sub)] mt-1">Broadcast instructions or access information to candidates instantly via WhatsApp.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Left Col: Target Select */}
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] flex flex-col h-full max-h-[800px] relative overflow-hidden">
                    <div className="card-shimmer" />
                    <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-hover)]">
                        <h3 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-2">
                            Select Recipients
                            <span className="bg-[var(--color-primary-light)] text-primary text-xs px-2 py-0.5 rounded-full border border-[var(--color-border-accent)]">{selectedUsers.size} Selected</span>
                        </h3>
                    </div>

                    <div className="p-4 border-b border-[var(--color-border)]">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-text-muted)]">
                                <span className="material-symbols-outlined text-[18px]">search</span>
                            </span>
                            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search by name, ID, or phone..." className="w-full h-10 pl-9 pr-4 text-sm rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300 text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]" />
                        </div>
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
                                const currentBlastState = blastStatus.find(s => s.id === c.id)?.status;

                                return (
                                    <div key={c.id} onClick={() => toggleSelect(c.id, c.phone)} className={`p-3 rounded-[var(--radius-sm)] flex items-center gap-4 transition-all cursor-pointer ${isSelected ? "bg-[var(--color-success-light)] border-[var(--color-success)]/20 border" : "bg-transparent border border-transparent hover:bg-[var(--color-bg-hover)]"}`}>
                                        <button className={`size-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${isSelected ? "bg-green-500 border-green-500 text-white" : !hasPhone ? "border-[var(--color-border)] bg-[var(--color-bg-hover)] cursor-not-allowed" : "border-[var(--color-border-strong)] bg-[var(--color-bg-card)]"}`}>
                                            {isSelected && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-[var(--color-text-main)] truncate">{c.name} <span className="font-normal text-[var(--color-text-muted)] text-xs ml-1">({c.displayId})</span></p>
                                            <p className={`text-xs mt-0.5 truncate ${hasPhone ? "text-[var(--color-text-sub)] font-mono" : "text-[var(--color-danger)] italic font-medium"}`}>{hasPhone ? c.phone : "No Phone Number Recorded"}</p>
                                        </div>

                                        {currentBlastState === "pending" && <span className="material-symbols-outlined text-[var(--color-warning)] animate-spin">refresh</span>}
                                        {currentBlastState === "success" && <span className="material-symbols-outlined text-[var(--color-success)]">check_circle</span>}

                                        {!isBlasting && hasPhone && (
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
                                <h4 className="text-sm font-semibold text-[var(--color-accent)]">How Blasting Works</h4>
                                <p className="text-xs text-[var(--color-text-sub)] mt-1">If you configure an actual WA API server in the backend, clicking "Simulate API Blast" will send real messages. Alternatively, you can send manual messages sequentially by clicking the green arrow on each user row.</p>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-4 border-t border-[var(--color-border)] pt-6">
                            <button onClick={handleBlast} disabled={selectedUsers.size === 0 || isBlasting} className="flex-1 py-3 px-4 rounded-[var(--radius-sm)] bg-[#25D366] hover:bg-[#1da851] text-white font-bold text-sm transition-all shadow-md shadow-[#25D366]/20 hover:shadow-lg hover:shadow-[#25D366]/30 hover:translate-y-[-1px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-press">
                                {isBlasting ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">campaign</span>}
                                {isBlasting ? "Sending via API..." : `Simulate API Blast (${selectedUsers.size})`}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
