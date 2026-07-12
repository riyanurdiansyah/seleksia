"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { globalDialog } from "@/app/providers/DialogProvider";
import Select2 from "../../components/Select2";

export default function SetupInterviewPage() {
    const router = useRouter();
    const [candidates, setCandidates] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState({
        candidateId: "",
        position: "",
        language: "id",
        maxQuestions: 5,
        context: "",
        accessStart: "",
        accessEnd: ""
    });

    const fetchSessions = () => {
        setLoading(true);
        fetch("/api/interview")
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSessions(data.sessions);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    const fetchCandidates = () => {
        fetch("/api/candidates")
            .then(res => res.json())
            .then(data => {
                const arr = data.candidates || data || [];
                setCandidates(arr);
                if (arr.length > 0) setForm(p => ({ ...p, candidateId: arr[0].id }));
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        if (showForm) {
            fetchCandidates();
        } else {
            fetchSessions();
        }
    }, [showForm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/interview/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Gagal menyimpan");

            await globalDialog.alert("Berhasil! Sesi wawancara dibuat.\\nSilakan arahkan kandidat ke URL:\\n/interview/" + form.candidateId);
            setShowForm(false);
            setForm({
                candidateId: candidates.length > 0 ? candidates[0].id : "",
                position: "",
                language: "id",
                maxQuestions: 5,
                context: "",
                accessStart: "",
                accessEnd: ""
            });
        } catch (error: any) {
            globalDialog.alert(error.message);
        }
    };

    const copyUrl = (candidateId: string) => {
        const url = window.location.origin + "/interview/" + candidateId;
        navigator.clipboard.writeText(url);
        globalDialog.alert("URL wawancara berhasil disalin: \\n" + url);
    };

    if (loading && !showForm) return <div className="p-8">Memuat data...</div>;

    return (
        <div className="p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Pengaturan Wawancara AI</h1>
                    <p className="text-[var(--color-text-muted)] mt-1">Kelola sesi wawancara yang telah Anda atur untuk kandidat.</p>
                </div>
                {!showForm && (
                    <button 
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-primary text-white font-semibold rounded-[var(--radius-sm)] text-sm hover:opacity-90 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Tambah Sesi Baru
                    </button>
                )}
            </div>

            {showForm ? (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm max-w-2xl">
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="flex justify-between items-center mb-4 border-b border-[var(--color-border)] pb-4">
                            <h2 className="text-lg font-bold text-[var(--color-text-main)]">Buat Sesi Wawancara</h2>
                            <button 
                                type="button" 
                                onClick={() => setShowForm(false)}
                                className="text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                            >
                                Batal
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Pilih Kandidat</label>
                            <Select2 
                                value={form.candidateId} 
                                onChange={(val) => setForm(p => ({...p, candidateId: val as string}))}
                                options={[
                                    { value: "", label: "-- Pilih Kandidat --" },
                                    ...candidates.map(c => ({ value: c.id, label: c.name + " (" + c.email + ")" }))
                                ]}
                                className="w-full text-left"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Posisi / Pekerjaan yang Dilamar</label>
                            <input 
                                type="text" 
                                value={form.position} 
                                onChange={e => setForm(p => ({...p, position: e.target.value}))}
                                placeholder="Misal: UI/UX Designer, Frontend Developer, dll..."
                                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Bahasa</label>
                                <Select2 
                                    value={form.language} 
                                    onChange={(val) => setForm(p => ({...p, language: val as string}))}
                                    options={[
                                        { value: "id", label: "Indonesia" },
                                        { value: "en", label: "English" }
                                    ]}
                                    className="w-full text-left"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Batas Pertanyaan</label>
                                <input 
                                    type="number" 
                                    min={1} max={20}
                                    value={form.maxQuestions || ""} 
                                    onChange={e => setForm(p => ({...p, maxQuestions: e.target.value ? parseInt(e.target.value) : 0}))}
                                    className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Tanggal Mulai</label>
                                <input 
                                    type="datetime-local" 
                                    value={form.accessStart} 
                                    onChange={e => setForm(p => ({...p, accessStart: e.target.value}))}
                                    className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Tanggal Berakhir</label>
                                <input 
                                    type="datetime-local" 
                                    value={form.accessEnd} 
                                    onChange={e => setForm(p => ({...p, accessEnd: e.target.value}))}
                                    className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Konteks / Keahlian / CV</label>
                            <textarea 
                                value={form.context} 
                                onChange={e => setForm(p => ({...p, context: e.target.value}))}
                                rows={8}
                                placeholder="Copy & Paste CV kandidat di sini, ATAU ketik keahlian spesifik yang ingin diuji..."
                                className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-main)] font-semibold rounded-[var(--radius-sm)] text-sm hover:opacity-90"
                            >
                                Batal
                            </button>
                            <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-[var(--radius-sm)] text-sm hover:opacity-90">
                                Simpan & Buat Sesi
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] uppercase text-xs border-b border-[var(--color-border)]">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Kandidat</th>
                                    <th className="px-6 py-4 font-bold">Bahasa</th>
                                    <th className="px-6 py-4 font-bold">Jadwal Akses</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-main)]">
                                {sessions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-text-muted)]">
                                            Belum ada sesi wawancara yang dibuat.
                                        </td>
                                    </tr>
                                ) : (
                                    sessions.map(session => (
                                        <tr key={session.id} className="hover:bg-[var(--color-bg-elevated)] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold">{session.candidate?.name || 'Kandidat Dihapus'}</div>
                                                <div className="text-xs text-[var(--color-text-muted)]">{session.candidate?.email}</div>
                                            </td>
                                            <td className="px-6 py-4 uppercase font-semibold">
                                                {session.language}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs">
                                                    <span className="font-bold">Mulai:</span> {session.accessStart ? new Date(session.accessStart).toLocaleString('id-ID') : 'Tanpa Batas'}
                                                </div>
                                                <div className="text-xs mt-1">
                                                    <span className="font-bold">Selesai:</span> {session.accessEnd ? new Date(session.accessEnd).toLocaleString('id-ID') : 'Tanpa Batas'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={"px-2 py-1 rounded-full text-[10px] font-bold uppercase " + (
                                                    session.status === 'completed' || session.status === 'analyzed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    session.status === 'started' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                )}>
                                                    {session.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center space-x-2">
                                                <button 
                                                    onClick={() => copyUrl(session.candidateId)}
                                                    className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                    title="Salin URL Wawancara"
                                                >
                                                    <span className="material-symbols-outlined text-[18px] block">link</span>
                                                </button>
                                                {(session.status === 'completed' || session.status === 'analyzed') && (
                                                    <Link 
                                                        href={"/interview/" + session.candidateId}
                                                        target="_blank"
                                                        className="inline-block p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                                        title="Lihat Laporan"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] block">analytics</span>
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
