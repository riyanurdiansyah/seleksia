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

interface BlastHistoryRecipient {
    name: string;
    email: string;
    status: "success" | "failed";
    message: string;
}

interface BlastHistoryEntry {
    id: string;
    timestamp: string;
    subject: string;
    total: number;
    success: number;
    failed: number;
    recipients: BlastHistoryRecipient[];
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
    const [showBlastModal, setShowBlastModal] = useState(false);
    const [blastStatus, setBlastStatus] = useState<{ id: string; status: "idle" | "pending" | "success" | "failed"; error?: string }[]>([]);
    const [search, setSearch] = useState("");

    // Templates & Variables States
    const [templates, setTemplates] = useState<EmailTemplate[]>(SYSTEM_TEMPLATES);
    const [selectedTemplateId, setSelectedTemplateId] = useState("sys-invitation");
    const [customVariables, setCustomVariables] = useState<CustomVariable[]>(DEFAULT_VARIABLES);

    // Blast History log
    const [history, setHistory] = useState<BlastHistoryEntry[]>([]);
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

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

    // Load custom templates, custom variables & history from localStorage
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

            const savedHistory = localStorage.getItem("seleksia_email_blast_history");
            if (savedHistory) {
                try {
                    setHistory(JSON.parse(savedHistory));
                } catch (e) {
                    console.error("Failed to parse email blast history", e);
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
        setShowBlastModal(true); // Open full-page monitor overlay

        const recipientIds = Array.from(selectedUsers);
        const initialStatuses = recipientIds.map(id => ({ id, status: "pending" as const }));
        setBlastStatus(initialStatuses);

        const recipientsLog: BlastHistoryRecipient[] = [];

        for (let i = 0; i < recipientIds.length; i++) {
            const candidateId = recipientIds[i];
            const candidate = initialData.find(c => c.id === candidateId);
            
            if (!candidate) continue;

            const personalizedBody = personalizeMessage(candidate, templateText);
            
            let statusState: "success" | "failed" = "success";
            let logMsg = `Email successfully sent to ${candidate.name} (${candidate.email})`;

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
                    const data = await res.json();
                    logMsg = data.message || `Sent successfully to ${candidate.email}`;
                    setBlastStatus(prev => prev.map(s => s.id === candidateId ? { ...s, status: "success" as const } : s));
                } else {
                    const errData = await res.json();
                    statusState = "failed";
                    logMsg = errData.error || "Failed to send email";
                    setBlastStatus(prev => prev.map(s => s.id === candidateId ? { ...s, status: "failed" as const, error: logMsg } : s));
                }
            } catch (err: any) {
                statusState = "failed";
                logMsg = err.message || "Network connection failure";
                setBlastStatus(prev => prev.map(s => s.id === candidateId ? { ...s, status: "failed" as const, error: logMsg } : s));
            }

            recipientsLog.push({
                name: candidate.name,
                email: candidate.email,
                status: statusState,
                message: logMsg
            });
        }

        const successCount = recipientsLog.filter(r => r.status === "success").length;
        const failedCount = recipientsLog.filter(r => r.status === "failed").length;

        const newHistoryEntry: BlastHistoryEntry = {
            id: "blast-" + Date.now(),
            timestamp: new Date().toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }),
            subject: emailSubject,
            total: recipientIds.length,
            success: successCount,
            failed: failedCount,
            recipients: recipientsLog
        };

        const updatedHistory = [newHistoryEntry, ...history];
        setHistory(updatedHistory);
        localStorage.setItem("seleksia_email_blast_history", JSON.stringify(updatedHistory));

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

    // Helpers
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    const stats = useMemo(() => {
        const total = initialData.length;
        const selected = selectedUsers.size;
        const templatesCount = templates.length;
        const variablesCount = customVariables.length;
        return { total, selected, templatesCount, variablesCount };
    }, [initialData, selectedUsers, templates, customVariables]);

    return (
        <div className="space-y-6 animate-slide-in-up">
            {/* Header Area */}
            <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 md:p-8 shadow-[var(--shadow-card)]">
                <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-16 -bottom-16 w-44 h-44 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[32px] text-primary animate-float">mail</span>
                            <h1 className="text-2xl md:text-3xl font-black text-[var(--color-text-main)] tracking-tight">
                                Email Invitation Workspace
                            </h1>
                        </div>
                        <p className="text-sm text-[var(--color-text-sub)] mt-2 max-w-xl font-medium">
                            Compose, personalize, and bulk-send email invitations or schedules to candidates instantly with live visual verification.
                        </p>
                    </div>
                    <Breadcrumb />
                </div>
            </div>

            {/* Dashboard / Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stat 1: Selected Recipients */}
                <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Active Recipients</p>
                            <h3 className="text-2xl font-black text-[var(--color-text-main)] mt-1.5">{stats.selected} <span className="text-sm font-semibold text-[var(--color-text-muted)]">/ {stats.total} selected</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-115 transition-transform duration-300">
                            <span className="material-symbols-outlined text-[24px]">group</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[11px] text-[var(--color-text-sub)] font-medium">Ready to broadcast invite emails</span>
                    </div>
                </div>

                {/* Stat 2: Active Template */}
                <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Active Template</p>
                            <h3 className="text-2xl font-black text-[var(--color-text-main)] mt-1.5 truncate max-w-[200px]">{activeTemplate ? activeTemplate.name : "None"}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-115 transition-transform duration-300">
                            <span className="material-symbols-outlined text-[24px]">drafts</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-[11px] text-[var(--color-text-sub)] font-medium">
                            {activeTemplate?.isSystem ? "System standard template" : "User-defined custom template"}
                        </span>
                    </div>
                </div>

                {/* Stat 3: Template Variables */}
                <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Active Variables</p>
                            <h3 className="text-2xl font-black text-[var(--color-text-main)] mt-1.5">{stats.variablesCount} <span className="text-sm font-semibold text-[var(--color-text-muted)]">Active</span></h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-115 transition-transform duration-300">
                            <span className="material-symbols-outlined text-[24px]">settings_suggest</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[11px] text-[var(--color-text-sub)] font-medium">Dynamic parameters injected</span>
                        </div>
                        <button
                            onClick={() => setShowVariablesModal(true)}
                            className="text-[11px] font-bold text-primary hover:text-primary-hover transition-colors flex items-center gap-0.5 cursor-pointer"
                        >
                            Manage <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Two-Pane Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT: Recipient Selection Directory */}
                <div className="lg:col-span-5 bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] flex flex-col h-[820px] relative overflow-hidden">
                    <div className="card-shimmer" />
                    
                    {/* Header */}
                    <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-hover)]">
                        <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-primary text-[20px]">contacts</span>
                            Recipients Directory
                        </h3>
                        <span className="bg-primary-light text-primary border border-primary/20 text-xs px-2.5 py-1 rounded-full font-bold">
                            {selectedUsers.size} Selected
                        </span>
                    </div>

                    {/* Search & Filter section */}
                    <div className="p-4 border-b border-[var(--color-border)] flex flex-col gap-3 bg-[var(--color-bg-card)]">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-text-muted)] pointer-events-none">
                                <span className="material-symbols-outlined text-[18px]">search</span>
                            </span>
                            <input 
                                value={search} 
                                onChange={(e) => setSearch(e.target.value)} 
                                type="text" 
                                placeholder="Search name, login ID, or email..." 
                                className="w-full h-11 pl-10 pr-4 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-primary/50 focus:ring-4 focus:ring-primary-light focus:bg-[var(--color-bg-card)] transition-all duration-300 text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]" 
                            />
                        </div>
                        {currentRole === "superadmin" && (
                            <Select2
                                value={selectedCompany}
                                onChange={handleCompanyChange}
                                options={[
                                    { value: "all", label: "All Companies / Tenant" },
                                    ...companies.map(c => ({ value: c.id, label: c.name }))
                                ]}
                                placeholder="Filter Company..."
                                className="w-full text-left"
                            />
                        )}
                    </div>

                    {/* Select All Row */}
                    <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-hover)]/40 flex justify-between items-center">
                        <button 
                            onClick={toggleSelectAll} 
                            className="text-xs font-bold text-primary hover:text-primary-hover transition-colors flex items-center gap-2 cursor-pointer btn-press"
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                {selectedUsers.size === filteredData.filter(d => d.email).length && selectedUsers.size > 0 
                                    ? "check_box" 
                                    : "check_box_outline_blank"}
                            </span>
                            Toggle Select All Available
                        </button>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-bold">
                            Only selects candidates with valid emails
                        </span>
                    </div>

                    {/* Candidate List Scroll area */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {filteredData.map(c => {
                            const hasEmail = !!c.email;
                            const isSelected = selectedUsers.has(c.id);
                            const currentBlastState = blastStatus.find(s => s.id === c.id);

                            return (
                                <div 
                                    key={c.id} 
                                    onClick={() => toggleSelect(c.id, c.email)} 
                                    className={`p-3.5 rounded-[var(--radius-sm)] flex items-center gap-3.5 border transition-all cursor-pointer hover:translate-x-1
                                        ${isSelected 
                                            ? "bg-primary-light border-primary/20 shadow-[var(--shadow-xs)]" 
                                            : "bg-transparent border-transparent hover:bg-[var(--color-bg-hover)]"
                                        }`}
                                >
                                    {/* Custom Checkbox */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleSelect(c.id, c.email); }}
                                        className={`size-5 rounded flex items-center justify-center border flex-shrink-0 transition-all cursor-pointer
                                            ${isSelected 
                                                ? "bg-primary border-primary text-white scale-105" 
                                                : !hasEmail 
                                                    ? "border-[var(--color-border)] bg-[var(--color-bg-elevated)] cursor-not-allowed opacity-40" 
                                                    : "border-[var(--color-border-strong)] bg-[var(--color-bg-card)] hover:border-primary"
                                            }`}
                                    >
                                        {isSelected && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                                    </button>

                                    {/* Initials Avatar */}
                                    <div className={`size-10 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 bg-gradient-to-br
                                        ${hasEmail ? "from-primary to-accent" : "from-[var(--color-text-muted)] to-[var(--color-bg-elevated)]"}`}>
                                        {getInitials(c.name)}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-bold text-[var(--color-text-main)] truncate max-w-[130px]">
                                                {c.name}
                                            </p>
                                            <span className="text-[9px] font-black tracking-widest text-[var(--color-text-muted)] uppercase border border-[var(--color-border)] px-1 rounded bg-[var(--color-bg-elevated)]">
                                                {c.displayId}
                                            </span>
                                        </div>
                                        <p className={`text-[10px] mt-1 font-mono truncate flex items-center gap-1
                                            ${hasEmail ? "text-[var(--color-text-sub)]" : "text-danger italic font-semibold"}`}>
                                            {hasEmail && <span className="material-symbols-outlined text-[12px] opacity-75">mail</span>}
                                            {hasEmail ? c.email : "No Email Address"}
                                        </p>
                                    </div>

                                    {/* Blast Status Indicator */}
                                    {currentBlastState?.status === "pending" && (
                                        <span className="material-symbols-outlined text-amber-500 animate-spin text-[18px]">sync</span>
                                    )}
                                    {currentBlastState?.status === "success" && (
                                        <span className="material-symbols-outlined text-emerald-500 text-[20px] glow-success rounded-full">check_circle</span>
                                    )}
                                    {currentBlastState?.status === "failed" && (
                                        <span className="material-symbols-outlined text-red-500 text-[20px] glow-danger rounded-full" title={currentBlastState.error}>error</span>
                                    )}

                                    {/* Action Status Pill */}
                                    {!currentBlastState && (
                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border
                                            ${hasEmail 
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                                                : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"}`}>
                                            {hasEmail ? "Ready" : "Invalid"}
                                        </span>
                                    )}
                                </div>
                            );
                        })}

                        {filteredData.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
                                <span className="material-symbols-outlined text-[32px] text-[var(--color-text-muted)]">search_off</span>
                                <p className="text-xs text-[var(--color-text-sub)] font-medium">No candidates match your search filter.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Compose and Preview stacked dynamically */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    
                    {/* BOX 1: EMAIL TEMPLATE EDITOR */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative overflow-hidden">
                        <div className="card-shimmer" />

                        <div className="space-y-4">
                            {/* Template Selection Header */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[var(--color-border)] pb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-[20px]">edit</span>
                                        Email Composer
                                    </h3>
                                    <p className="text-[11px] text-[var(--color-text-sub)] mt-0.5">Select a template base and customize variables</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select2
                                        value={selectedTemplateId}
                                        onChange={(val) => setSelectedTemplateId(val)}
                                        options={templates.map(t => ({ value: t.id, label: t.name + (t.isSystem ? " (System)" : "") }))}
                                        className="w-48 text-left"
                                    />
                                    <button
                                        onClick={() => setShowSaveTemplateModal(true)}
                                        className="p-2.5 rounded-[var(--radius-xs)] text-primary bg-primary-light hover:bg-primary-mid transition-all btn-press border border-primary/20 flex items-center justify-center cursor-pointer"
                                        title="Save Template Configuration"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">save_as</span>
                                    </button>
                                    {activeTemplate && !activeTemplate.isSystem && (
                                        <button
                                            onClick={handleDeleteTemplate}
                                            className="p-2.5 rounded-[var(--radius-xs)] text-red-600 bg-red-500/10 hover:bg-red-500/20 transition-all btn-press border border-red-500/20 flex items-center justify-center cursor-pointer"
                                            title="Delete Custom Template"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Subject input */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">Subject Line</label>
                                <input 
                                    type="text" 
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="w-full h-11 px-4 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-primary/50 focus:ring-4 focus:ring-primary-light focus:bg-[var(--color-bg-card)] transition-all duration-300 text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]" 
                                    placeholder="Enter email subject..."
                                />
                            </div>

                            {/* Variables list */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">Template Parameters</label>
                                    <button 
                                        onClick={() => setShowVariablesModal(true)}
                                        className="text-[11px] font-bold text-primary hover:text-primary-hover transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">edit_attributes</span>
                                        Edit Variables
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-hover)]/30 max-h-24 overflow-y-auto">
                                    {/* System params */}
                                    <button onClick={() => insertVariable("{{name}}")} className="px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-bg-card)] text-[9px] font-mono font-black text-primary hover:bg-primary-light transition-all btn-press border border-[var(--color-border)] cursor-pointer" title="Candidate Name">+ {"{{name}}"}</button>
                                    <button onClick={() => insertVariable("{{displayId}}")} className="px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-bg-card)] text-[9px] font-mono font-black text-primary hover:bg-primary-light transition-all btn-press border border-[var(--color-border)] cursor-pointer" title="Login Credentials ID">+ {"{{displayId}}"}</button>
                                    <button onClick={() => insertVariable("{{email}}")} className="px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-bg-card)] text-[9px] font-mono font-black text-primary hover:bg-primary-light transition-all btn-press border border-[var(--color-border)] cursor-pointer" title="Candidate Email">+ {"{{email}}"}</button>
                                    <button onClick={() => insertVariable("{{test_name}}")} className="px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-bg-card)] text-[9px] font-mono font-black text-primary hover:bg-primary-light transition-all btn-press border border-[var(--color-border)] cursor-pointer" title="Category Test Battery">+ {"{{test_name}}"}</button>
                                    
                                    {/* Custom variables */}
                                    {customVariables.map(v => (
                                        <button 
                                            key={v.key}
                                            onClick={() => insertVariable(`{{${v.key}}}`)}
                                            className="px-2 py-1 rounded-[var(--radius-xs)] bg-accent/10 text-accent hover:bg-accent/20 text-[9px] font-mono font-black border border-accent/20 transition-all btn-press cursor-pointer" 
                                            title={`Value: ${v.value}`}
                                        >
                                            + {`{{${v.key}}}`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Template Text Area */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">Message Content</label>
                                <textarea
                                    value={templateText}
                                    onChange={(e) => setTemplateText(e.target.value)}
                                    rows={7}
                                    className="w-full p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] focus:border-primary/50 focus:ring-4 focus:ring-primary-light focus:bg-[var(--color-bg-card)] transition-all duration-300 text-xs text-[var(--color-text-main)] resize-none font-sans placeholder-[var(--color-text-muted)] leading-relaxed"
                                    placeholder="Type template message body here..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* BOX 2: LIVE EMAIL CLIENT PREVIEW */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative overflow-hidden">
                        <div className="card-shimmer" />

                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
                                <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">visibility</span>
                                    Live Preview Verification
                                </h3>
                                <span className="text-[10px] font-bold text-[var(--color-text-sub)] flex items-center gap-1.5 bg-[var(--color-bg-hover)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                                    Previewing candidate: <strong className="text-primary">{previewUser.name}</strong>
                                </span>
                            </div>

                            {/* Mock Browser/Mail client window */}
                            <div className="border border-[var(--color-border-strong)] rounded-xl overflow-hidden shadow-sm bg-[var(--color-bg-card)]">
                                {/* Browser style title bar */}
                                <div className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] px-4 py-2.5 flex items-center gap-2">
                                    {/* Window controls */}
                                    <div className="flex gap-1.5 mr-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-80" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-80" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-80" />
                                    </div>
                                    {/* Path address */}
                                    <div className="bg-[var(--color-bg-card)] text-[9px] text-[var(--color-text-muted)] font-bold px-3 py-0.5 rounded flex-1 max-w-[280px] mx-auto text-center border border-[var(--color-border)] truncate">
                                        https://mail.seleksia.com/client/preview-sandbox
                                    </div>
                                </div>

                                {/* Mail Headers */}
                                <div className="bg-[var(--color-bg-hover)]/30 p-3.5 border-b border-[var(--color-border)] space-y-1.5 text-[11px] text-[var(--color-text-sub)]">
                                    <div className="flex gap-2">
                                        <span className="font-extrabold w-12 text-[var(--color-text-muted)]">From:</span>
                                        <span className="text-[var(--color-text-main)] font-semibold">SELEKSIA Administrator &lt;noreply@seleksia.com&gt;</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-extrabold w-12 text-[var(--color-text-muted)]">To:</span>
                                        <span className="text-[var(--color-text-main)] font-semibold">{previewUser.name} &lt;{previewUser.email}&gt;</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-extrabold w-12 text-[var(--color-text-muted)]">Subject:</span>
                                        <span className="text-primary font-bold">{emailSubject || "(No Subject line defined)"}</span>
                                    </div>
                                </div>

                                {/* Styled Sandbox Email body */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 min-h-[220px] max-h-[300px] overflow-y-auto">
                                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 shadow-xs max-w-md mx-auto flex flex-col gap-4">
                                        {/* Header band */}
                                        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
                                            <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
                                            <span className="text-[10px] font-black tracking-widest text-[var(--color-text-main)]">SELEKSIA CBT PLATFORM</span>
                                        </div>
                                        
                                        {/* Main content */}
                                        <div className="text-[11px] text-[var(--color-text-main)] leading-relaxed whitespace-pre-wrap font-sans">
                                            {personalizedPreview || "(Blank message contents defined)"}
                                        </div>

                                        {/* Footer metadata */}
                                        <div className="border-t border-[var(--color-border)] pt-3 mt-1 flex flex-col sm:flex-row justify-between text-[8px] text-[var(--color-text-muted)] font-medium gap-1">
                                            <span>Generated automatically. Do not reply to this mailbox.</span>
                                            <span>© SELEKSIA CBT</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main sending trigger */}
                            <div className="pt-3 flex justify-end">
                                <button 
                                    onClick={handleBlast} 
                                    disabled={selectedUsers.size === 0 || isBlasting || !emailSubject || !templateText} 
                                    className="w-full py-3 px-6 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent hover:shadow-[0_8px_25px_var(--color-primary-glow)] hover:scale-[1.01] text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer btn-press"
                                >
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                    Broadcast Invite Emails ({selectedUsers.size})
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* SECTION: Broadcast History Logs */}
            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 relative overflow-hidden">
                <div className="card-shimmer" />
                <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4 mb-4">
                    <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-primary text-[22px]">history</span>
                        <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider">Broadcast History Logs</h3>
                    </div>
                    {history.length > 0 && (
                        <button
                            onClick={() => {
                                if (confirm("Are you sure you want to clear all history logs?")) {
                                    setHistory([]);
                                    localStorage.removeItem("seleksia_email_blast_history");
                                }
                            }}
                            className="text-[11px] font-bold text-red-500 hover:text-red-650 transition-colors flex items-center gap-1.5 cursor-pointer btn-press"
                        >
                            <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                            Clear History
                        </button>
                    )}
                </div>

                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
                        <span className="material-symbols-outlined text-[32px] text-[var(--color-text-muted)] opacity-60">history</span>
                        <p className="text-xs text-[var(--color-text-sub)] font-medium">No previous broadcast sessions logged.</p>
                    </div>
                ) : (
                    <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                        {history.map((entry) => {
                            const isExpanded = expandedHistoryId === entry.id;
                            return (
                                <div key={entry.id} className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg-card)]">
                                    {/* Summary Line */}
                                    <div 
                                        onClick={() => setExpandedHistoryId(isExpanded ? null : entry.id)}
                                        className="p-4 hover:bg-[var(--color-bg-hover)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <span className="text-[10px] font-bold font-mono text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded border border-[var(--color-border)]">{entry.timestamp}</span>
                                                <span className="text-xs font-bold text-[var(--color-text-main)] truncate max-w-[300px]" title={entry.subject}>
                                                    Subject: "{entry.subject}"
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-sub)] font-medium">
                                                Total Candidates Processed: <strong className="text-[var(--color-text-main)]">{entry.total}</strong>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-2 text-[9px] font-extrabold tracking-wider">
                                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded">
                                                    {entry.success} SUCCESS
                                                </span>
                                                {entry.failed > 0 && (
                                                    <span className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">
                                                        {entry.failed} FAILED
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`material-symbols-outlined text-[20px] text-[var(--color-text-muted)] transition-transform duration-205 ${isExpanded ? "rotate-180" : ""}`}>
                                                keyboard_arrow_down
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expandable Details Log Console */}
                                    {isExpanded && (
                                        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-hover)]/20">
                                            <div className="bg-[var(--color-bg-elevated)] px-4 py-2 flex justify-between items-center text-[9px] font-bold text-[var(--color-text-muted)]">
                                                <span>RECIPIENT & STATUS LOG MESSAGE</span>
                                                <span>STATE</span>
                                            </div>
                                            <div className="divide-y divide-[var(--color-border)] max-h-64 overflow-y-auto font-mono text-[10px]">
                                                {entry.recipients.map((rec, rIdx) => (
                                                    <div key={rIdx} className="p-3.5 flex justify-between items-start gap-4 hover:bg-[var(--color-bg-hover)]/30 transition-colors">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[var(--color-text-main)] font-semibold text-xs truncate">{rec.name} &lt;{rec.email}&gt;</p>
                                                            <p className={`text-[10px] mt-1.5 font-sans leading-relaxed ${rec.status === "success" ? "text-[var(--color-text-sub)]" : "text-red-500 font-semibold"}`}>
                                                                {rec.message}
                                                            </p>
                                                        </div>
                                                        <div className="flex-shrink-0 pt-0.5">
                                                            {rec.status === "success" ? (
                                                                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                                                    SUCCESS
                                                                </span>
                                                            ) : (
                                                                <span className="text-[8px] font-black text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                                                                    FAILED
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* BLAST LOG MONITOR DIALOG OVERLAY (Opens when broadcasting) - BLOCKS BACKGROUND FULL PAGE */}
            {showBlastModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 cursor-not-allowed" onClick={(e) => e.stopPropagation()} />
                    <div className="relative w-full max-w-xl bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-strong)] shadow-2xl animate-slide-in-up p-6 flex flex-col max-h-[85vh] z-[100000]">
                        <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3 flex-shrink-0">
                            <h3 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">terminal</span>
                                Broadcast Delivery Monitor Console
                            </h3>
                            {!isBlasting && (
                                <button onClick={() => setShowBlastModal(false)} className="p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-colors cursor-pointer">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto py-4 space-y-4">
                            {/* Live progress details */}
                            <div className="bg-[var(--color-bg-hover)] p-4 rounded-xl border border-[var(--color-border)] space-y-3">
                                <div className="flex justify-between text-xs font-bold text-[var(--color-text-main)]">
                                    <span className="flex items-center gap-1.5">
                                        {isBlasting ? (
                                            <span className="animate-spin material-symbols-outlined text-[16px] text-primary">sync</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-[16px] text-emerald-500">done_all</span>
                                        )}
                                        {isBlasting ? "Sending Broadcast Emails..." : "Broadcast Complete!"}
                                    </span>
                                    <span>{progressPercentage}% Completed</span>
                                </div>
                                <div className="w-full bg-[var(--color-bg-elevated)] h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-primary h-full transition-all duration-300 rounded-full" 
                                        style={{ width: `${progressPercentage}%` }} 
                                    />
                                </div>
                            </div>

                            {/* Reports counters */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center">
                                    <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Delivered</p>
                                    <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        {blastStatus.filter(s => s.status === "success").length}
                                    </h4>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
                                    <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400">Failed</p>
                                    <h4 className="text-base font-black text-red-600 dark:text-red-400 mt-0.5">
                                        {blastStatus.filter(s => s.status === "failed").length}
                                    </h4>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-center">
                                    <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Pending</p>
                                    <h4 className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                        {blastStatus.filter(s => s.status === "pending").length}
                                    </h4>
                                </div>
                            </div>

                            {/* Live logs console */}
                            <div className="border border-[var(--color-border-strong)] rounded-xl overflow-hidden">
                                <div className="bg-[var(--color-bg-elevated)] px-4 py-2 border-b border-[var(--color-border)] flex justify-between items-center text-[9px] font-bold text-[var(--color-text-muted)]">
                                    <span>RECIPIENT NAME & MESSAGE LOG</span>
                                    <span>STATUS</span>
                                </div>
                                <div className="divide-y divide-[var(--color-border)] max-h-48 overflow-y-auto font-mono text-[10px]">
                                    {blastStatus.map((s, idx) => {
                                        const user = initialData.find(c => c.id === s.id);
                                        return (
                                            <div key={idx} className="p-3 flex justify-between items-start gap-4 hover:bg-[var(--color-bg-hover)] transition-colors">
                                                <div className="min-w-0 flex-1 pr-4">
                                                    <p className="text-[var(--color-text-main)] font-semibold truncate text-xs">{user?.name || "Unknown Candidate"}</p>
                                                    <p className={`text-[9px] mt-1 font-sans ${s.status === "failed" ? "text-red-500 font-bold" : "text-[var(--color-text-sub)]"}`}>
                                                        {s.status === "success" 
                                                            ? `Email successfully sent to ${user?.email}` 
                                                            : s.status === "failed" 
                                                                ? s.error || "Delivery failed" 
                                                                : `Preparing delivery queue for ${user?.email}...`}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0 pt-0.5">
                                                    {s.status === "pending" && (
                                                        <span className="flex items-center gap-1 text-amber-500 font-extrabold uppercase text-[8px]">
                                                            <span className="animate-spin material-symbols-outlined text-[10px]">sync</span>
                                                            PENDING
                                                        </span>
                                                    )}
                                                    {s.status === "success" && (
                                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase text-[8px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                            <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                                            DELIVERED
                                                        </span>
                                                    )}
                                                    {s.status === "failed" && (
                                                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-extrabold uppercase text-[8px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                                            <span className="material-symbols-outlined text-[10px]">error</span>
                                                            FAILED
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-[var(--color-border)] pt-4 flex justify-end flex-shrink-0">
                            <button 
                                onClick={() => setShowBlastModal(false)}
                                disabled={isBlasting}
                                className="px-5 py-2.5 rounded-[var(--radius-sm)] bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all cursor-pointer btn-press"
                            >
                                Done Monitor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: Save Template As Configuration */}
            {showSaveTemplateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0" onClick={() => setShowSaveTemplateModal(false)} />
                    <div className="relative w-full max-w-md bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-strong)] shadow-[var(--shadow-lg)] animate-slide-in-up p-6 space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">save</span>
                                Save Template Configuration
                            </h3>
                            <p className="text-xs text-[var(--color-text-sub)] mt-1">Save subject and message body content values as a reuseable template preset.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Template Identifier Name *</label>
                            <input 
                                type="text"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                className="w-full h-11 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)] focus:border-primary/50 focus:ring-4 focus:ring-primary-light focus:bg-[var(--color-bg-card)] transition-all duration-300"
                                placeholder="e.g., Undangan Kategori Technical Test"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button 
                                onClick={() => setShowSaveTemplateModal(false)}
                                className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] border border-[var(--color-border)] text-xs font-bold hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer btn-press"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveTemplate}
                                disabled={!newTemplateName.trim()}
                                className="px-4 py-2 rounded-[var(--radius-sm)] bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all cursor-pointer btn-press"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Custom Variable Management Modal */}
            {showVariablesModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0" onClick={() => setShowVariablesModal(false)} />
                    <div className="relative w-full max-w-xl bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-strong)] shadow-[var(--shadow-lg)] animate-slide-in-up p-6 flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3 flex-shrink-0">
                            <h3 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">edit_attributes</span>
                                Manage Custom Variables
                            </h3>
                            <button onClick={() => setShowVariablesModal(false)} className="p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-4 space-y-5">
                            {/* Insert layout form */}
                            <div className="p-4 bg-[var(--color-bg-hover)] rounded-xl border border-[var(--color-border)] space-y-3.5">
                                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-main)]">Add Custom Variable</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">VARIABLE KEY (lowercase, clean string)</label>
                                        <input 
                                            type="text"
                                            value={newVarKey}
                                            onChange={(e) => setNewVarKey(e.target.value)}
                                            className="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary/50 transition-all font-mono"
                                            placeholder="e.g., support_phone"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">VARIABLE FALLBACK VALUE</label>
                                        <input 
                                            type="text"
                                            value={newVarVal}
                                            onChange={(e) => setNewVarVal(e.target.value)}
                                            className="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary/50 transition-all"
                                            placeholder="e.g., +62 822-1234-5678"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button 
                                        onClick={handleAddVariable}
                                        disabled={!newVarKey.trim() || !newVarVal.trim()}
                                        className="px-4 py-2 rounded-[var(--radius-sm)] bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer btn-press"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                        Add Variable
                                    </button>
                                </div>
                            </div>

                            {/* Configured values table/list */}
                            <div className="space-y-2.5">
                                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] px-1">Configured Active Variables</h4>
                                <div className="border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)] max-h-56 overflow-y-auto pr-1">
                                    {customVariables.map((v) => {
                                        const isSystem = DEFAULT_VARIABLES.some(d => d.key === v.key);
                                        return (
                                            <div key={v.key} className="flex justify-between items-center p-3.5 hover:bg-[var(--color-bg-hover)]/40 transition-colors">
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-xs font-mono font-bold text-primary">{`{{${v.key}}}`}</span>
                                                    <span className="text-[9px] font-black tracking-widest text-[var(--color-text-muted)] uppercase border border-[var(--color-border)] px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] ml-2.5">
                                                        {isSystem ? "SYSTEM DEFAULT" : "CUSTOM VARIABLE"}
                                                    </span>
                                                    <p className="text-xs text-[var(--color-text-sub)] truncate mt-1.5 font-semibold font-mono bg-[var(--color-bg-elevated)] p-1 rounded max-w-sm">{v.value}</p>
                                                </div>
                                                {!isSystem && (
                                                    <button 
                                                        onClick={() => handleDeleteVariable(v.key)}
                                                        className="p-2 rounded text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center cursor-pointer btn-press border border-transparent hover:border-red-500/20"
                                                        title="Delete Variable Key"
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
                                className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition-all cursor-pointer btn-press"
                            >
                                Done Editing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
