"use client";

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

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    isSystem?: boolean;
}

interface CustomVariable {
    key: string;
    value: string;
}

const SYSTEM_TEMPLATES: EmailTemplate[] = [
    {
        id: "sys-invitation",
        name: "Undangan Ujian",
        subject: "Undangan Mengikuti Ujian Seleksi - SELEKSIA",
        body: "Halo {{name}},\n\nAnda telah dijadwalkan untuk mengikuti ujian seleksi secara daring (CBT) dengan detail sebagai berikut:\n\n- Perusahaan: {{company_name}}\n- Kategori Ujian: {{test_name}}\n- ID Login: {{displayId}}\n- Alamat Email: {{email}}\n\nSilakan masuk ke halaman utama aplikasi kami dan masukkan kredensial di atas untuk memulai ujian.\n\nJika menemui kendala, silakan hubungi kami melalui {{support_email}}.\n\nSelamat mengerjakan dan semoga sukses!\n\nSalam,\nTim Seleksi",
        isSystem: true
    },
    {
        id: "sys-reminder",
        name: "Reminder Jadwal",
        subject: "Reminder: Jadwal Ujian Seleksi - SELEKSIA",
        body: "Halo {{name}},\n\nIni adalah pengingat bahwa Anda memiliki jadwal ujian seleksi daring (CBT) yang akan segera dilaksanakan di {{company_name}}.\n\nDetail Akun Anda:\n- ID Login: {{displayId}}\n- Jenis Ujian: {{test_name}}\n\nHarap pastikan koneksi internet Anda stabil sebelum memulai ujian.\n\nTerima kasih.",
        isSystem: true
    }
];

const DEFAULT_VARIABLES: CustomVariable[] = [
    { key: "company_name", value: "SELEKSIA CBT Platform" },
    { key: "support_email", value: "support@seleksia.com" }
];

export default function EmailClient({ initialData }: { initialData: CandidateResult[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [emailSubject, setEmailSubject] = useState("");
    const [templateText, setTemplateText] = useState("");
    
    const [isBlasting, setIsBlasting] = useState(false);
    const [blastStatus, setBlastStatus] = useState<{ id: string; status: "idle" | "pending" | "success" | "failed"; error?: string }[]>([]);
    const [search, setSearch] = useState("");

    // Templates & Variables States
    const [templates, setTemplates] = useState<EmailTemplate[]>(SYSTEM_TEMPLATES);
    const [selectedTemplateId, setSelectedTemplateId] = useState("sys-invitation");
    const [customVariables, setCustomVariables] = useState<CustomVariable[]>(DEFAULT_VARIABLES);

    // Save template modals
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");

    // Manage variables modal
    const [showVariablesModal, setShowVariablesModal] = useState(false);
    const [newVarKey, setNewVarKey] = useState("");
    const [newVarVal, setNewVarVal] = useState("");

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

    // Load custom templates & custom variables from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedTemplates = localStorage.getItem("seleksia_custom_templates");
            if (savedTemplates) {
                try {
                    const parsed = JSON.parse(savedTemplates);
                    setTemplates([...SYSTEM_TEMPLATES, ...parsed]);
                } catch (e) {
                    console.error("Failed to parse custom templates", e);
                }
            }

            const savedVars = localStorage.getItem("seleksia_custom_variables");
            if (savedVars) {
                try {
                    const parsed = JSON.parse(savedVars);
                    setCustomVariables([...DEFAULT_VARIABLES, ...parsed]);
                } catch (e) {
                    console.error("Failed to parse custom variables", e);
                }
            }
        }
    }, []);

    // Load templates into subject & text
    useEffect(() => {
        const found = templates.find(t => t.id === selectedTemplateId);
        if (found) {
            setEmailSubject(found.subject);
            setTemplateText(found.body);
        }
    }, [selectedTemplateId, templates]);

    useEffect(() => {
        const role = sessionStorage.getItem("candidateRole") || "user";
        setCurrentRole(role);

        if (role === "superadmin") {
            fetchCompanies();
        }
    }, [fetchCompanies]);

    const handleCompanyChange = (val: string) => {
        setSelectedCompany(val);
        setSelectedUsers(new Set());
        setBlastStatus([]);
        router.push(`/communication/email?companyId=${val}`);
    };

    const filteredData = initialData.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.displayId.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );

    const toggleSelect = (id: string, email: string) => {
        if (!email) return;
        const newSet = new Set(selectedUsers);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedUsers(newSet);
    };

    const toggleSelectAll = () => {
        const withEmails = filteredData.filter(d => d.email);
        if (selectedUsers.size === withEmails.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(withEmails.map(d => d.id)));
        }
    };

    const insertVariable = (variable: string) => {
        setTemplateText(prev => prev + " " + variable);
    };

    const personalizeMessage = useCallback((user: CandidateResult, msg: string) => {
        let personalized = msg
            .replace(/\{\{name\}\}/g, user.name)
            .replace(/\{\{test_name\}\}/g, user.assignedTests || "Test Assessment")
            .replace(/\{\{displayId\}\}/g, user.displayId)
            .replace(/\{\{email\}\}/g, user.email);

        // Replace custom variables
        customVariables.forEach(v => {
            const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
            personalized = personalized.replace(regex, v.value);
        });

        return personalized;
    }, [customVariables]);

    const previewUser = useMemo<CandidateResult>(() => {
        if (selectedUsers.size > 0) {
            const firstId = Array.from(selectedUsers)[0];
            const found = initialData.find(c => c.id === firstId);
            if (found) return found;
        }
        return {
            id: "preview-id",
            name: "Nama Peserta",
            displayId: "PSK-999",
            phone: "+62 812-3456-789",
            email: "peserta@domain.com",
            assignedTests: "Tes Intelegensi Umum, MBTI",
            status: "Ready"
        };
    }, [selectedUsers, initialData]);

    const personalizedPreview = useMemo(() => {
        return personalizeMessage(previewUser, templateText);
    }, [previewUser, templateText, personalizeMessage]);

    const handleBlast = async () => {
        if (selectedUsers.size === 0) return;
        setIsBlasting(true);

        const recipientIds = Array.from(selectedUsers);
        const initialStatuses = recipientIds.map(id => ({ id, status: "pending" as const }));
        setBlastStatus(initialStatuses);

        for (let i = 0; i < recipientIds.length; i++) {
            const candidateId = recipientIds[i];
            const candidate = initialData.find(c => c.id === candidateId);
            
            if (!candidate) continue;

            const personalizedBody = personalizeMessage(candidate, templateText);

            try {
                const res = await fetch("/api/communication/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        candidateId,
                        subject: emailSubject,
                        message: personalizedBody
                    })
                });

                if (res.ok) {
                    setBlastStatus(prev => prev.map(s => s.id === candidateId ? { ...s, status: "success" as const } : s));
                } else {
                    const errData = await res.json();
                    setBlastStatus(prev => prev.map(s => s.id === candidateId ? { ...s, status: "failed" as const, error: errData.error || "Failed" } : s));
                }
            } catch (err) {
                console.error("Failed to send email to candidate " + candidateId, err);
                setBlastStatus(prev => prev.map(s => s.id === candidateId ? { ...s, status: "failed" as const, error: "Network Error" } : s));
            }
        }

        setIsBlasting(false);
    };

    const progressPercentage = useMemo(() => {
        if (blastStatus.length === 0) return 0;
        const processed = blastStatus.filter(s => s.status === "success" || s.status === "failed").length;
        return Math.round((processed / blastStatus.length) * 100);
    }, [blastStatus]);

    // Save Template logic
    const handleSaveTemplate = () => {
        if (!newTemplateName.trim()) return;
        const newTemplate: EmailTemplate = {
            id: "tmpl-" + Date.now(),
            name: newTemplateName.trim(),
            subject: emailSubject,
            body: templateText,
            isSystem: false
        };
        const updatedCustom = templates.filter(t => !t.isSystem).concat(newTemplate);
        localStorage.setItem("seleksia_custom_templates", JSON.stringify(updatedCustom));
        setTemplates([...SYSTEM_TEMPLATES, ...updatedCustom]);
        setSelectedTemplateId(newTemplate.id);
        setShowSaveTemplateModal(false);
        setNewTemplateName("");
    };

    const handleDeleteTemplate = () => {
        const found = templates.find(t => t.id === selectedTemplateId);
        if (!found || found.isSystem) return;

        const updatedCustom = templates.filter(t => !t.isSystem && t.id !== selectedTemplateId);
        localStorage.setItem("seleksia_custom_templates", JSON.stringify(updatedCustom));
        setTemplates([...SYSTEM_TEMPLATES, ...updatedCustom]);
        setSelectedTemplateId("sys-invitation");
    };

    // Variables logic
    const handleAddVariable = () => {
        const cleanKey = newVarKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (!cleanKey || !newVarVal.trim()) return;

        if (customVariables.some(v => v.key === cleanKey)) {
            alert("Variabel dengan kunci tersebut sudah ada!");
            return;
        }

        const newVar = { key: cleanKey, value: newVarVal.trim() };
        const updatedCustom = customVariables.filter(v => !DEFAULT_VARIABLES.some(d => d.key === v.key)).concat(newVar);
        localStorage.setItem("seleksia_custom_variables", JSON.stringify(updatedCustom));
        setCustomVariables([...DEFAULT_VARIABLES, ...updatedCustom]);
        setNewVarKey("");
        setNewVarVal("");
    };

    const handleDeleteVariable = (key: string) => {
        if (DEFAULT_VARIABLES.some(d => d.key === key)) return;
        const updatedCustom = customVariables.filter(v => v.key !== key && !DEFAULT_VARIABLES.some(d => d.key === v.key));
        localStorage.setItem("seleksia_custom_variables", JSON.stringify(updatedCustom));
        setCustomVariables([...DEFAULT_VARIABLES, ...updatedCustom]);
    };

    const activeTemplate = templates.find(t => t.id === selectedTemplateId);

    return (
        <div className="space-y-6 animate-slide-in-up">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight flex items-center gap-2">
                            Email Invitation <span className="material-symbols-outlined text-indigo-500">mail</span>
                        </h1>
                        <p className="text-sm text-[var(--color-text-sub)] mt-1 font-medium">Send bulk email invitations or schedules to candidates instantly.</p>
                    </div>
                    <Breadcrumb />
                </div>
            </div>

            {isBlasting && (
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-card)]">
                    <div className="flex justify-between text-sm font-bold text-[var(--color-text-main)] mb-2">
                        <span>Email Blast Progress</span>
                        <span>{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-[var(--color-bg-elevated)] h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-indigo-600 h-full transition-all duration-300 rounded-full" 
                            style={{ width: `${progressPercentage}%` }} 
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* Left: Recipient Selection */}
                <div className="xl:col-span-5 bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] flex flex-col h-[750px] relative overflow-hidden">
                    <div className="card-shimmer" />
                    <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-hover)]">
                        <h3 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-2">
                            Recipients
                            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">{selectedUsers.size} Selected</span>
                        </h3>
                    </div>

                    <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-text-muted)]">
                                <span className="material-symbols-outlined text-[18px]">search</span>
                            </span>
                            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search name, ID, or email..." className="w-full h-10 pl-9 pr-4 text-sm rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300 text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]" />
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
                            <button onClick={toggleSelectAll} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors flex items-center gap-1 btn-press">
                                <span className="material-symbols-outlined text-[16px]">{selectedUsers.size === filteredData.filter(d => d.email).length && selectedUsers.size > 0 ? "check_box" : "check_box_outline_blank"}</span>
                                Select / Deselect All
                            </button>
                        </div>
                        <div className="space-y-1 mt-1">
                            {filteredData.map(c => {
                                const hasEmail = !!c.email;
                                const isSelected = selectedUsers.has(c.id);
                                const currentBlastState = blastStatus.find(s => s.id === c.id);

                                return (
                                    <div key={c.id} onClick={() => toggleSelect(c.id, c.email)} className={`p-3 rounded-[var(--radius-sm)] flex items-center gap-4 transition-all cursor-pointer ${isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/20 border" : "bg-transparent border border-transparent hover:bg-[var(--color-bg-hover)]"}`}>
                                        <button className={`size-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${isSelected ? "bg-indigo-600 border-indigo-600 text-white" : !hasEmail ? "border-[var(--color-border)] bg-[var(--color-bg-hover)] cursor-not-allowed" : "border-[var(--color-border-strong)] bg-[var(--color-bg-card)]"}`}>
                                            {isSelected && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-[var(--color-text-main)] truncate">{c.name} <span className="font-normal text-[var(--color-text-muted)] text-xs ml-1">({c.displayId})</span></p>
                                            <p className={`text-xs mt-0.5 truncate ${hasEmail ? "text-[var(--color-text-sub)] font-mono" : "text-[var(--color-danger)] italic font-medium"}`}>{hasEmail ? c.email : "No Email Address"}</p>
                                        </div>

                                        {currentBlastState?.status === "pending" && <span className="material-symbols-outlined text-[var(--color-warning)] animate-spin text-[18px]">refresh</span>}
                                        {currentBlastState?.status === "success" && <span className="material-symbols-outlined text-[var(--color-success)] text-[18px]">check_circle</span>}
                                        {currentBlastState?.status === "failed" && <span className="material-symbols-outlined text-[var(--color-danger)] text-[18px]" title={currentBlastState.error}>error</span>}
                                    </div>
                                )
                            })}

                            {filteredData.length === 0 && (
                                <p className="text-center py-6 text-sm text-[var(--color-text-sub)]">No candidates match your search.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Template and Preview Tabs */}
                <div className="xl:col-span-7 flex flex-col gap-6">
                    {/* Template Editor */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative overflow-hidden">
                        <div className="card-shimmer" />
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 border-b border-[var(--color-border)] pb-3">
                            <h3 className="text-base font-bold text-[var(--color-text-main)]">Email Template</h3>
                            <div className="flex items-center gap-2">
                                <Select2
                                    value={selectedTemplateId}
                                    onChange={(val) => setSelectedTemplateId(val)}
                                    options={templates.map(t => ({ value: t.id, label: t.name + (t.isSystem ? " (Sistem)" : "") }))}
                                    className="w-48 text-left"
                                />
                                <button
                                    onClick={() => setShowSaveTemplateModal(true)}
                                    className="p-2 rounded-[var(--radius-xs)] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors btn-press border border-indigo-100"
                                    title="Simpan Sebagai Template Baru"
                                >
                                    <span className="material-symbols-outlined text-[20px]">save_as</span>
                                </button>
                                {activeTemplate && !activeTemplate.isSystem && (
                                    <button
                                        onClick={handleDeleteTemplate}
                                        className="p-2 rounded-[var(--radius-xs)] text-red-600 bg-red-50 hover:bg-red-100 transition-colors btn-press border border-red-100"
                                        title="Hapus Template Kustom Ini"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Subject</label>
                                <input 
                                    type="text" 
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="w-full h-10 px-4 text-sm rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus:translate-y-[-1px] transition-all duration-300 text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]" 
                                    placeholder="Enter email subject"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Template Variables</label>
                                    <button 
                                        onClick={() => setShowVariablesModal(true)}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 btn-press"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">edit_attributes</span>
                                        Kelola Variabel
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <button onClick={() => insertVariable("{{name}}")} className="px-2.5 py-1.5 rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] text-[11px] font-mono font-bold text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-indigo-600 transition-all btn-press border border-[var(--color-border)]" title="Insert Candidate Name">+ {"{{name}}"}</button>
                                    <button onClick={() => insertVariable("{{displayId}}")} className="px-2.5 py-1.5 rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] text-[11px] font-mono font-bold text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-indigo-600 transition-all btn-press border border-[var(--color-border)]" title="Insert Login ID">+ {"{{displayId}}"}</button>
                                    <button onClick={() => insertVariable("{{email}}")} className="px-2.5 py-1.5 rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] text-[11px] font-mono font-bold text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-indigo-600 transition-all btn-press border border-[var(--color-border)]" title="Insert Email">+ {"{{email}}"}</button>
                                    <button onClick={() => insertVariable("{{test_name}}")} className="px-2.5 py-1.5 rounded-[var(--radius-xs)] bg-[var(--color-bg-elevated)] text-[11px] font-mono font-bold text-[var(--color-text-sub)] hover:bg-[var(--color-bg-hover)] hover:text-indigo-600 transition-all btn-press border border-[var(--color-border)]" title="Insert Test Battery Name">+ {"{{test_name}}"}</button>
                                    {customVariables.map(v => (
                                        <button 
                                            key={v.key}
                                            onClick={() => insertVariable(`{{${v.key}}}`)}
                                            className="px-2.5 py-1.5 rounded-[var(--radius-xs)] bg-indigo-50/40 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 text-[11px] font-mono font-bold hover:bg-indigo-50 hover:text-indigo-850 transition-all btn-press border border-indigo-100/50" 
                                            title={`Value: ${v.value}`}
                                        >
                                            + {`{{${v.key}}}`}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={templateText}
                                    onChange={(e) => setTemplateText(e.target.value)}
                                    rows={10}
                                    className="w-full p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:bg-[var(--color-bg-card)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm text-[var(--color-text-main)] resize-none font-sans placeholder-[var(--color-text-muted)]"
                                    placeholder="Type your email template body here..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative overflow-hidden">
                        <div className="card-shimmer" />
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-[var(--color-text-main)]">Personalized Email Preview</h3>
                            <span className="text-xs text-[var(--color-text-muted)]">Showing preview for: <strong className="text-indigo-600 dark:text-indigo-400">{previewUser.name}</strong></span>
                        </div>

                        {/* Email Window Mockup */}
                        <div className="border border-[var(--color-border-strong)] rounded-xl overflow-hidden shadow-sm">
                            {/* Window Header */}
                            <div className="bg-[var(--color-bg-hover)] border-b border-[var(--color-border)] p-4 space-y-2">
                                <div className="flex text-xs text-[var(--color-text-muted)] gap-1.5">
                                    <span className="font-semibold w-16">From:</span>
                                    <span className="text-[var(--color-text-main)]">SELEKSIA Administrator &lt;noreply@seleksia.com&gt;</span>
                                </div>
                                <div className="flex text-xs text-[var(--color-text-muted)] gap-1.5">
                                    <span className="font-semibold w-16">To:</span>
                                    <span className="text-[var(--color-text-main)]">{previewUser.name} &lt;{previewUser.email}&gt;</span>
                                </div>
                                <div className="flex text-xs text-[var(--color-text-muted)] gap-1.5">
                                    <span className="font-semibold w-16">Subject:</span>
                                    <span className="text-[var(--color-text-main)] font-semibold">{emailSubject || "(No Subject)"}</span>
                                </div>
                            </div>
                            {/* Window Body */}
                            <div className="bg-[var(--color-bg-card)] p-6 min-h-[220px] max-h-[350px] overflow-y-auto font-sans text-sm text-[var(--color-text-main)] whitespace-pre-wrap leading-relaxed border-t border-[var(--color-border)]">
                                {personalizedPreview || "(Empty Message)"}
                            </div>
                        </div>

                        <div className="mt-6 flex gap-4 pt-6 border-t border-[var(--color-border)]">
                            <button 
                                onClick={handleBlast} 
                                disabled={selectedUsers.size === 0 || isBlasting || !emailSubject || !templateText} 
                                className="flex-1 py-3 px-4 rounded-[var(--radius-sm)] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:translate-y-[-1px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-press"
                            >
                                {isBlasting ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : <span className="material-symbols-outlined text-[18px]">send</span>}
                                {isBlasting ? "Sending Invites..." : `Simulate Email Blast (${selectedUsers.size})`}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal: Save Template As */}
            {showSaveTemplateModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0" onClick={() => setShowSaveTemplateModal(false)} />
                    <div className="relative w-full max-w-md bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up p-6 space-y-4">
                        <h3 className="text-lg font-bold text-[var(--color-text-main)]">Simpan Template Baru</h3>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Nama Template *</label>
                            <input 
                                type="text"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 transition-all"
                                placeholder="e.g. Undangan Program MT"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button 
                                onClick={() => setShowSaveTemplateModal(false)}
                                className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] border border-[var(--color-border)] text-xs font-semibold hover:bg-[var(--color-bg-hover)] transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleSaveTemplate}
                                disabled={!newTemplateName.trim()}
                                className="px-4 py-2 rounded-[var(--radius-sm)] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md disabled:opacity-50 transition-all"
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Manage Variables */}
            {showVariablesModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-[9999] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0" onClick={() => setShowVariablesModal(false)} />
                    <div className="relative w-full max-w-xl bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-strong)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in-up p-6 flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3 flex-shrink-0">
                            <h3 className="text-lg font-bold text-[var(--color-text-main)]">Kelola Variabel Template</h3>
                            <button onClick={() => setShowVariablesModal(false)} className="p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-4 space-y-4">
                            {/* Add Variable Form */}
                            <div className="p-4 bg-[var(--color-bg-hover)] rounded-xl border border-[var(--color-border)] space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-main)]">Tambah Variabel Kustom</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] mb-1">KUNCI (Hanya Huruf, Angka, & Underline)</label>
                                        <input 
                                            type="text"
                                            value={newVarKey}
                                            onChange={(e) => setNewVarKey(e.target.value)}
                                            className="w-full h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-indigo-500 transition-all font-mono"
                                            placeholder="e.g. support_phone"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] mb-1">NILAI / VALUE</label>
                                        <input 
                                            type="text"
                                            value={newVarVal}
                                            onChange={(e) => setNewVarVal(e.target.value)}
                                            className="w-full h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-indigo-500 transition-all"
                                            placeholder="e.g. +62 812-345-678"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button 
                                        onClick={handleAddVariable}
                                        disabled={!newVarKey.trim() || !newVarVal.trim()}
                                        className="px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 btn-press"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                        Tambah Variabel
                                    </button>
                                </div>
                            </div>

                            {/* Variables List */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-1">Daftar Variabel Aktif</h4>
                                <div className="space-y-1 max-h-56 overflow-y-auto pr-1 border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
                                    {customVariables.map((v) => {
                                        const isSystem = DEFAULT_VARIABLES.some(d => d.key === v.key);
                                        return (
                                            <div key={v.key} className="flex justify-between items-center p-3 hover:bg-[var(--color-bg-hover)]/40 transition-colors">
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{`{{${v.key}}}`}</span>
                                                    <span className="text-xs text-[var(--color-text-muted)] ml-2 font-medium">({isSystem ? "Sistem" : "Kustom"})</span>
                                                    <p className="text-xs text-[var(--color-text-sub)] truncate mt-0.5 font-medium">{v.value}</p>
                                                </div>
                                                {!isSystem && (
                                                    <button 
                                                        onClick={() => handleDeleteVariable(v.key)}
                                                        className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center btn-press"
                                                        title="Hapus variabel kustom ini"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-[var(--color-border)] pt-4 flex justify-end flex-shrink-0">
                            <button 
                                onClick={() => setShowVariablesModal(false)}
                                className="px-4 py-2 rounded-[var(--radius-sm)] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
