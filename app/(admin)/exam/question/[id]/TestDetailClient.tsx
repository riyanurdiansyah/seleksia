"use client";
import { globalDialog } from "@/app/providers/DialogProvider";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Breadcrumb from "../../../components/Breadcrumb";
import Select2 from "../../../components/Select2";
import * as XLSX from "xlsx";

import { 
    CustomScoringConfig, 
    PRESET_SCORING_SCHEMES, 
    ScoringBand, 
    StatusBand,
    DEFAULT_STATUS_BANDS,
    RecommendationRule, 
    GatekeeperRule 
} from "@/lib/competencyScoring";

/* ===== Types ===== */
type QuestionType = "multiple_choice" | "multiple_choice_weighted" | "true_false" | "likert_scale" | "forced_choice" | "number_series" | "image_pattern" | "essay";
type TestCategory = "intelligence" | "personality" | "aptitude" | "projective";

interface Question {
    id: string;
    displayId: string;
    type: QuestionType;
    text: string;
    options: string[];
    optionWeights?: Record<string, number> | null;
    correctAnswer?: string | null;
    competency?: string | null;
    imageUrl?: string | null;
    timeLimit?: number | null;
    sortOrder: number;
}

interface Test {
    id: string;
    displayId: string;
    name: string;
    category: TestCategory;
    questionType: QuestionType;
    description: string | null;
    duration: number;
    totalQuestionsToUse: number;
    status: "draft" | "published" | "archived";
    scoringConfig?: CustomScoringConfig | null;
    createdAt: string;
    questions: Question[];
}

const questionTypeConfig: Record<QuestionType, { label: string; icon: string; desc: string }> = {
    multiple_choice: { label: "Multiple Choice", icon: "radio_button_checked", desc: "Pilihan ganda A-E" },
    multiple_choice_weighted: { label: "Weighted Choice", icon: "iso", desc: "Pilihan ganda berbobot" },
    true_false: { label: "True / False", icon: "toggle_on", desc: "Benar atau salah" },
    likert_scale: { label: "Likert Scale", icon: "linear_scale", desc: "Skala 1-5" },
    forced_choice: { label: "Forced Choice", icon: "compare_arrows", desc: "Pilih paling/kurang sesuai" },
    number_series: { label: "Number Series", icon: "pin", desc: "Deret angka" },
    image_pattern: { label: "Image Pattern", icon: "grid_view", desc: "Pola gambar" },
    essay: { label: "Essay", icon: "edit_note", desc: "Jawaban uraian" },
};

const categoryConfig: Record<TestCategory, { label: string; icon: string; color: string }> = {
    intelligence: { label: "Intelligence", icon: "psychology", color: "text-[var(--color-accent)] bg-[var(--color-accent-light)]" },
    personality: { label: "Personality", icon: "mood", color: "text-pink-600 bg-pink-50 dark:bg-pink-900/20" },
    aptitude: { label: "Aptitude", icon: "school", color: "text-[var(--color-warning)] bg-[var(--color-warning-light)]" },
    projective: { label: "Projective", icon: "draw", color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20" },
};

const statusConfig: Record<Test["status"], { label: string; bg: string; text: string }> = {
    draft: { label: "Draft", bg: "bg-[var(--color-bg-elevated)]", text: "text-[var(--color-text-sub)]" },
    published: { label: "Published", bg: "bg-[var(--color-success-light)]", text: "text-[var(--color-success)]" },
    archived: { label: "Archived", bg: "bg-[var(--color-bg-elevated)]", text: "text-[var(--color-text-muted)]" },
};

export default function TestDetailClient({ testId }: { testId: string }) {
    const router = useRouter();
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"questions" | "settings" | "scoring">("questions");

    // Edit form
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState<TestCategory>("intelligence");
    const [editQuestionType, setEditQuestionType] = useState<QuestionType>("multiple_choice");
    const [editDescription, setEditDescription] = useState("");
    const [editDuration, setEditDuration] = useState(30);
    const [editTotalQuestions, setEditTotalQuestions] = useState(0);

    // Scoring Scheme State
    const [scoringConfig, setScoringConfig] = useState<CustomScoringConfig>(PRESET_SCORING_SCHEMES["5_tier_sales"]);
    const [selectedPreset, setSelectedPreset] = useState<string>("5_tier_sales");

    // Add question
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showAIGenerate, setShowAIGenerate] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [aiGenParams, setAiGenParams] = useState({
        topic: "",
        type: "multiple_choice" as QuestionType,
        count: 5,
        difficulty: "Medium"
    });
    const [newQuestion, setNewQuestion] = useState({
        text: "",
        type: "multiple_choice" as QuestionType,
        options: ["", "", "", "", ""],
        optionWeights: {} as Record<string, number>,
        correctAnswer: "",
        competency: "",
        timeLimit: 0,
        imageUrl: "",
    });

    // Edit question
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [editQuestion, setEditQuestion] = useState({
        text: "",
        type: "multiple_choice" as QuestionType,
        options: ["", "", "", "", ""],
        optionWeights: {} as Record<string, number>,
        correctAnswer: "",
        competency: "",
        timeLimit: 0,
        imageUrl: "",
    });

    // Image uploading state
    const [uploadingImage, setUploadingImage] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            await globalDialog.alert("Only image files are allowed!");
            return;
        }
        if (file.size > 1 * 1024 * 1024) {
            await globalDialog.alert("Maximum file size is 1MB!");
            return;
        }

        setUploadingImage(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            if (isEdit) {
                setEditQuestion((p) => ({ ...p, imageUrl: data.imageUrl }));
            } else {
                setNewQuestion((p) => ({ ...p, imageUrl: data.imageUrl }));
            }
        } catch (err) {
            console.error(err);
            await globalDialog.alert("Failed to upload image.");
        } finally {
            setUploadingImage(false);
        }
    };

    // Delete question confirmation
    const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<{ id: string; text: string } | null>(null);

    /* Fetch test details */
    useEffect(() => {
        if (!testId) return;
        const fetchTest = async () => {
            try {
                const res = await fetch(`/api/tests/${testId}`);
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || "Failed to fetch test");
                }
                const data = await res.json();
                setTest(data);
                
                // Initialize form states
                setEditName(data.name);
                setEditCategory(data.category);
                setEditQuestionType(data.questionType);
                setEditDescription(data.description || "");
                setEditDuration(data.duration);
                setEditTotalQuestions(data.totalQuestionsToUse || 0);

                if (data.scoringConfig) {
                    const cfg = data.scoringConfig;
                    if (!cfg.statusBands || cfg.statusBands.length === 0) {
                        cfg.statusBands = JSON.parse(JSON.stringify(DEFAULT_STATUS_BANDS));
                    }
                    setScoringConfig(cfg);
                } else {
                    setScoringConfig(PRESET_SCORING_SCHEMES["5_tier_sales"]);
                }
            } catch (err: any) {
                console.error(err);
                setTest(null);
                setFetchError(err.message || "Failed to fetch test details");
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [testId, router]);

    /* Apply Preset Scoring Scheme */
    const handleApplyPreset = (presetKey: string) => {
        const preset = PRESET_SCORING_SCHEMES[presetKey];
        if (preset) {
            setSelectedPreset(presetKey);
            setScoringConfig(JSON.parse(JSON.stringify(preset)));
        }
    };

    /* Save test settings & scoring config */
    const handleSave = async () => {
        if (!test) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/tests/${test.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName,
                    category: editCategory,
                    questionType: editQuestionType,
                    description: editDescription,
                    duration: editDuration,
                    totalQuestionsToUse: editTotalQuestions,
                    scoringConfig: scoringConfig,
                }),
            });
            if (!res.ok) throw new Error("Failed");
            const updated = await res.json();
            setTest(updated);
            await globalDialog.alert("Pengaturan skema penilaian berhasil disimpan!");
        } catch (err) {
            console.error(err);
            await globalDialog.alert("Gagal menyimpan pengaturan test.");
        } finally {
            setSaving(false);
        }
    };

    /* Toggle publish */
    const togglePublish = async () => {
        if (!test) return;
        const newStatus = test.status === "published" ? "draft" : "published";
        try {
            const res = await fetch(`/api/tests/${test.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed");
            }
            const updated = await res.json();
            setTest(updated);
        } catch (err: any) {
            console.error(err);
            await globalDialog.alert(err.message || "Gagal mengubah status publish.");
        }
    };

    /* Add question */
    const handleAddQuestion = async () => {
        if ((!newQuestion.text && !newQuestion.imageUrl) || !test) return;
        try {
            const res = await fetch(`/api/tests/${test.id}/questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: newQuestion.type,
                    text: newQuestion.text,
                    options: newQuestion.type === "essay" ? [] : newQuestion.options.filter((o) => o.trim() !== ""),
                    optionWeights: newQuestion.type === "multiple_choice_weighted" ? newQuestion.optionWeights : null,
                    correctAnswer: newQuestion.correctAnswer || null,
                    competency: newQuestion.competency?.trim() || null,
                    timeLimit: newQuestion.timeLimit || null,
                    imageUrl: newQuestion.imageUrl || null,
                }),
            });
            if (!res.ok) throw new Error("Failed to add question");
            const created = await res.json();
            setTest((prev) => prev ? { ...prev, questions: [...prev.questions, created] } : prev);
            setNewQuestion({ text: "", type: test.questionType, options: ["", "", "", "", ""], optionWeights: {}, correctAnswer: "", competency: "", timeLimit: 0, imageUrl: "" });
        } catch (err) {
            console.error(err);
            await globalDialog.alert(err instanceof Error ? err.message : String(err));
        }
    };

    /* Download Import Template */
    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        
        // Define columns based on Question structure
        const headers = [
            "Teks Soal", 
            "Tipe Soal (multiple_choice / multiple_choice_weighted / true_false)", 
            "Opsi A", 
            "Opsi B", 
            "Opsi C", 
            "Opsi D", 
            "Opsi E", 
            "Jawaban Benar (A/B/C/D/E atau True/False)", 
            "Batas Waktu (detik)",
            "Bobot A",
            "Bobot B",
            "Bobot C",
            "Bobot D",
            "Bobot E",
            "Kompetensi"
        ];
        
        // Example rows for types
        const exampleRows = [
            [
                "Bagaimana Anda menindaklanjuti prospek yang menunda keputusan pembelian?",
                "multiple_choice",
                "Menganalisis hambatan dan memberikan solusi nilai tambah",
                "Membiarkan prospek menghubungi kembali nanti",
                "Menurunkan harga secara drastis",
                "Menghubungi setiap jam hingga merespon",
                "Membatalkan prospek",
                "A",
                "60",
                "", "", "", "", "",
                "Sales Execution & Performance Control"
            ],
            [
                "Pilihlah tindakan yang mencerminkan kejujuran Anda dalam menyampaikan data penjualan.",
                "multiple_choice",
                "Menyampaikan data riil tanpa rekayasa apapun",
                "Menyesuaikan data sedikit agar target terlihat tercapai",
                "Menyalahkan tim logistik saat stok tidak akurat",
                "Menunda pelaporan hingga akhir bulan",
                "Hanya melaporkan capaian yang bagus saja",
                "A",
                "60",
                "", "", "", "", "",
                "Integrity"
            ],
            [
                "Pilihlah pernyataan yang paling mendeskripsikan diri Anda.",
                "multiple_choice_weighted",
                "Suka bergaul",
                "Suka menyendiri",
                "Suka memimpin",
                "Suka menganalisis",
                "Suka melayani",
                "",
                "60",
                "5", "2", "4", "3", "4",
                "Customer Focus"
            ]
        ];
        
        const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
        
        // Set column widths
        const wscols = [
            {wch: 40}, {wch: 35}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 25}, {wch: 20},
            {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 35}
        ];
        ws['!cols'] = wscols;
        
        XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
        XLSX.writeFile(wb, "Template_Import_Soal.xlsx");
    };

    /* Handle Import Excel */
    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!test) return;
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Skip header row
            if (jsonData.length <= 1) {
                await globalDialog.alert("File kosong atau tidak memiliki data soal.");
                setIsImporting(false);
                return;
            }

            const questions = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

                const type = (row[1] || "multiple_choice").toString().trim();
                
                // Construct options array (columns 2 to 6 are A to E)
                const options = [];
                for (let j = 2; j <= 6; j++) {
                    if (row[j] !== undefined && row[j] !== null && row[j] !== "") {
                        options.push(row[j].toString());
                    }
                }

                if (type === "true_false" && options.length === 0) {
                    options.push("True", "False");
                }

                // Extract weights for weighted choice (columns 9 to 13 are Bobot A to E)
                let optionWeights: Record<string, number> | null = null;
                if (type === "multiple_choice_weighted") {
                    optionWeights = {};
                    const letters = ['A', 'B', 'C', 'D', 'E'];
                    for (let j = 9; j <= 13; j++) {
                        const w = parseInt(row[j]);
                        if (!isNaN(w)) {
                            optionWeights[letters[j - 9]] = w;
                        }
                    }
                }

                let correctAns = row[7] ? row[7].toString().trim() : null;
                if (correctAns && correctAns.length === 1) {
                    correctAns = correctAns.toUpperCase();
                } else if (correctAns) {
                    correctAns = correctAns.charAt(0).toUpperCase() + correctAns.slice(1).toLowerCase();
                }

                const competencyVal = row[14] ? row[14].toString().trim() : null;

                questions.push({
                    text: row[0].toString(),
                    type: type as QuestionType,
                    options: options.length > 0 ? options : [],
                    optionWeights: optionWeights,
                    correctAnswer: correctAns,
                    competency: competencyVal,
                    timeLimit: row[8] ? parseInt(row[8].toString()) : 0,
                });
            }

            if (questions.length === 0) {
                await globalDialog.alert("Tidak ada soal valid yang ditemukan di file.");
                setIsImporting(false);
                return;
            }

            const res = await fetch(`/api/tests/${test.id}/questions/bulk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Gagal mengimpor soal");
            }

            // Refetch test data or reload
            window.location.reload();
        } catch (err) {
            console.error(err);
            await globalDialog.alert("Terjadi kesalahan saat mengimpor soal: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsImporting(false);
            e.target.value = ''; // Reset input
        }
    };

    /* Handle AI Generate */
    const handleAIGenerate = async () => {
        if (!test || !aiGenParams.topic) return;
        setIsAIGenerating(true);
        try {
            const res = await fetch('/api/ai/generate-questions', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    testId: test.id,
                    topic: aiGenParams.topic,
                    type: aiGenParams.type,
                    count: aiGenParams.count,
                    difficulty: aiGenParams.difficulty
                })
            });
            if (!res.ok) {
                const err = await res.json();
                await globalDialog.alert("Terjadi kesalahan: " + (err.error || err.details || "Gagal generate soal dengan AI"));
                return;
            }
            window.location.reload();
        } catch (err: any) {
            console.error("Fetch error:", err);
            await globalDialog.alert("Terjadi kesalahan jaringan atau server saat generate soal dengan AI.");
        } finally {
            setIsAIGenerating(false);
        }
    };

    /* Delete question */
    const handleDeleteQuestion = async (questionId: string) => {
        if (!test) return;
        try {
            const res = await fetch(`/api/tests/${test.id}/questions/${questionId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            setTest((prev) => prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== questionId) } : prev);
        } catch (err) {
            console.error(err);
        }
    };

    /* Start editing a question */
    const startEditQuestion = (q: Question) => {
        setEditingQuestionId(q.id);
        setEditQuestion({
            text: q.text,
            type: q.type,
            options: q.options.length > 0 ? [...q.options] : ["", "", "", "", ""],
            optionWeights: q.optionWeights || {},
            correctAnswer: q.correctAnswer || "",
            competency: q.competency || "",
            timeLimit: q.timeLimit || 0,
            imageUrl: q.imageUrl || "",
        });
    };

    /* Save edited question */
    const handleSaveQuestion = async () => {
        if (!test || !editingQuestionId) return;
        if (!editQuestion.text && !editQuestion.imageUrl) {
            await globalDialog.alert("Question must have either text or image!");
            return;
        }
        try {
            const res = await fetch(`/api/tests/${test.id}/questions/${editingQuestionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: editQuestion.text,
                    type: editQuestion.type,
                    options: editQuestion.type === "essay" ? [] : editQuestion.options.filter((o) => o.trim() !== ""),
                    optionWeights: editQuestion.type === "multiple_choice_weighted" ? editQuestion.optionWeights : null,
                    correctAnswer: editQuestion.correctAnswer || null,
                    competency: editQuestion.competency?.trim() || null,
                    timeLimit: editQuestion.timeLimit || null,
                    imageUrl: editQuestion.imageUrl || null,
                }),
            });
            if (!res.ok) throw new Error("Failed");
            const updated = await res.json();
            setTest((prev) => prev ? { ...prev, questions: prev.questions.map((q) => q.id === editingQuestionId ? updated : q) } : prev);
            setEditingQuestionId(null);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <span className="material-symbols-outlined text-4xl text-[var(--color-text-muted)] animate-spin">progress_activity</span>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="text-center py-24">
                <span className="material-symbols-outlined text-5xl text-[var(--color-text-muted)] block mb-3">error</span>
                <p className="text-[var(--color-text-sub)] mb-4">{fetchError || "Test not found"}</p>
                <button onClick={() => router.push("/exam/question")} className="text-primary hover:underline text-sm">← Back to Tests</button>
            </div>
        );
    }

    const cat = categoryConfig[test.category];
    const st = statusConfig[test.status];
    const qt = questionTypeConfig[test.questionType];

    return (
        <>
            {/* Back + Header */}
            <div className="flex flex-col gap-4 animate-slide-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button onClick={() => router.push("/exam/question")} className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors w-fit">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Back to Tests
                    </button>
                    <Breadcrumb />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-[var(--radius-md)] ${cat.color}`}>
                            <span className="material-symbols-outlined text-[28px]">{cat.icon}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-tight">{test.name}</h1>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                                <span className="font-mono">{test.displayId}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">{qt.icon}</span>{qt.label}</span>
                                <span>•</span>
                                <span>{test.questions.length} questions</span>
                                <span>•</span>
                                <span>{test.duration} min</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={togglePublish} className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] font-medium text-sm transition-all btn-press ${test.status === "published" ? "bg-[var(--color-warning-light)] hover:bg-[var(--color-warning-light)] text-[var(--color-warning)]" : "bg-[var(--color-success-light)] hover:bg-[var(--color-success-light)] text-[var(--color-success)]"}`}>
                            <span className="material-symbols-outlined text-[18px]">{test.status === "published" ? "unpublished" : "publish"}</span>
                            {test.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--color-border)]">
                <button onClick={() => setActiveTab("questions")} className={`py-3 border-b-2 font-medium text-sm mr-6 transition-colors ${activeTab === "questions" ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]"}`}>
                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">quiz</span>Questions ({test.questions.length})</span>
                </button>
                <button onClick={() => setActiveTab("scoring")} className={`py-3 border-b-2 font-medium text-sm mr-6 transition-colors ${activeTab === "scoring" ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]"}`}>
                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">tune</span>Scoring Scheme & Thresholds</span>
                </button>
                <button onClick={() => setActiveTab("settings")} className={`py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === "settings" ? "border-primary text-primary" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]"}`}>
                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">settings</span>General Settings</span>
                </button>
            </div>

            {/* ===== QUESTIONS TAB ===== */}
            {activeTab === "questions" && (
                <>
                    {/* Action Area */}
                    <div className="mb-8 space-y-4">
                        <div className="flex justify-start">
                            <div className="inline-flex items-center p-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-sm">
                                <button onClick={() => { setShowAddQuestion(!showAddQuestion); setShowImport(false); setShowAIGenerate(false); }} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-200 ${showAddQuestion ? 'bg-primary text-white shadow-sm' : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <span className="material-symbols-outlined text-[18px]">edit_square</span>
                                    Manual Input
                                </button>
                                <button onClick={() => { setShowImport(!showImport); setShowAddQuestion(false); setShowAIGenerate(false); }} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-200 ${showImport ? 'bg-[var(--color-success)] text-white shadow-sm' : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                                    Import Excel
                                </button>
                                <button onClick={() => { setShowAIGenerate(!showAIGenerate); setShowAddQuestion(false); setShowImport(false); }} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-200 ${showAIGenerate ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm' : 'text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                    AI Generate
                                </button>
                            </div>
                        </div>

                        {(showAddQuestion || showImport || showAIGenerate) && (
                            <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-xl transition-all duration-500 ease-out animate-slide-in-up">
                            {showAddQuestion && (
                                <div className="p-6 space-y-5 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Question Type</label>
                                            <Select2
                                                value={newQuestion.type}
                                                onChange={(val) => setNewQuestion((p) => ({ ...p, type: val as QuestionType }))}
                                                options={Object.entries(questionTypeConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                                                className="w-full text-left"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Competency / Sub-category</label>
                                            <input 
                                                type="text" 
                                                value={newQuestion.competency} 
                                                onChange={(e) => setNewQuestion((p) => ({ ...p, competency: e.target.value }))} 
                                                className="w-full h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" 
                                                placeholder="e.g. Sales Execution, Integrity" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Time Limit (sec, 0 = none)</label>
                                            <input type="number" value={newQuestion.timeLimit} onChange={(e) => setNewQuestion((p) => ({ ...p, timeLimit: parseInt(e.target.value) || 0 }))} className="w-full h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" min="0" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Question Text (Optional if image uploaded)</label>
                                        <textarea value={newQuestion.text} onChange={(e) => setNewQuestion((p) => ({ ...p, text: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300 resize-none" placeholder="Enter question..." />
                                    </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Question Image (Optional)</label>
                                    {newQuestion.imageUrl ? (
                                        <div className="relative inline-block border border-[var(--color-border)] rounded-[var(--radius-sm)] p-1 bg-[var(--color-bg-elevated)]">
                                            <img src={newQuestion.imageUrl} alt="Preview" className="max-h-32 object-contain rounded" />
                                            <button
                                                type="button"
                                                onClick={() => setNewQuestion(prev => ({ ...prev, imageUrl: "" }))}
                                                className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 flex items-center justify-center shadow-lg transition-colors"
                                                title="Remove Image"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">image</span>
                                                <span>Select Image</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, false)}
                                                    className="hidden"
                                                />
                                            </label>
                                            {uploadingImage && (
                                                <span className="material-symbols-outlined text-[18px] text-[var(--color-text-muted)] animate-spin">
                                                    progress_activity
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {newQuestion.type !== "essay" && newQuestion.type !== "likert_scale" && newQuestion.type !== "true_false" && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Options (Text or Image)</label>
                                        <div className="space-y-1.5">
                                            {newQuestion.options.map((opt, i) => {
                                                const isImg = opt.startsWith("/");
                                                return (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] w-4 text-center">{String.fromCharCode(65 + i)}</span>
                                                        {isImg ? (
                                                            <div className="flex-1 flex items-center gap-2 p-1 border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] h-8">
                                                                <img src={opt} alt={`Option ${String.fromCharCode(65 + i)}`} className="h-full object-contain rounded" />
                                                                <button type="button" onClick={() => { const o = [...newQuestion.options]; o[i] = ""; setNewQuestion((p) => ({ ...p, options: o })); }} className="text-red-500 hover:text-red-700 ml-auto p-1 flex items-center" title="Remove Option Image">
                                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <input value={opt} onChange={(e) => { const o = [...newQuestion.options]; o[i] = e.target.value; setNewQuestion((p) => ({ ...p, options: o })); }} className="flex-1 h-8 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                                                        )}

                                                        {!isImg && (
                                                            <label className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] cursor-pointer flex items-center" title="Upload Option Image">
                                                                <span className="material-symbols-outlined text-[18px]">image</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (!file) return;
                                                                        const formData = new FormData();
                                                                        formData.append("file", file);
                                                                        try {
                                                                            const res = await fetch("/api/upload", { method: "POST", body: formData });
                                                                            if (!res.ok) throw new Error("Upload failed");
                                                                            const data = await res.json();
                                                                            const o = [...newQuestion.options];
                                                                            o[i] = data.imageUrl;
                                                                            setNewQuestion((p) => ({ ...p, options: o }));
                                                                        } catch (err) {
                                                                            await globalDialog.alert("Upload failed");
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                        )}
                                                        {newQuestion.type === "multiple_choice_weighted" ? (
                                                            <input type="number" placeholder="Weight" value={newQuestion.optionWeights[String.fromCharCode(65 + i)] ?? ""} onChange={(e) => setNewQuestion(p => ({ ...p, optionWeights: { ...p.optionWeights, [String.fromCharCode(65 + i)]: parseInt(e.target.value) || 0 } }))} className="w-16 h-8 px-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-center focus:border-primary" />
                                                        ) : (
                                                            <button type="button" onClick={() => setNewQuestion((p) => ({ ...p, correctAnswer: String.fromCharCode(65 + i) }))} className={`p-1 rounded-[var(--radius-sm)] transition-colors ${newQuestion.correctAnswer === String.fromCharCode(65 + i) ? "text-[var(--color-success)] bg-[var(--color-success-light)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-success)]"}`} title="Correct">
                                                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {newQuestion.options.length < 8 && (
                                                <button type="button" onClick={() => setNewQuestion((p) => ({ ...p, options: [...p.options, ""] }))} className="flex items-center gap-1 text-[10px] text-primary hover:underline ml-6">
                                                    <span className="material-symbols-outlined text-[12px]">add</span>Add Option
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {newQuestion.type === "true_false" && (
                                    <div className="flex gap-3">
                                        {["True", "False"].map((opt) => (
                                            <button key={opt} type="button" onClick={() => setNewQuestion((p) => ({ ...p, correctAnswer: opt }))} className={`flex-1 py-2 rounded-[var(--radius-sm)] border-2 text-sm font-medium transition-all ${newQuestion.correctAnswer === opt ? "border-primary bg-[var(--color-primary-light)] text-primary" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}>{opt}</button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button onClick={handleAddQuestion} disabled={!newQuestion.text && !newQuestion.imageUrl} className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50 disabled:cursor-not-allowed">
                                        <span className="material-symbols-outlined text-[16px]">add</span>Add Question
                                    </button>
                                </div>
                                </div>
                            )}

                            {showImport && (
                                <div className="p-6 space-y-5 animate-fade-in">
                                    <div className="p-5 bg-[var(--color-success-light)] border border-[var(--color-success)]/20 rounded-[var(--radius-md)] text-sm text-[var(--color-text-sub)] flex flex-col gap-4">
                                    <p>Anda dapat mengimpor banyak soal sekaligus dengan mengunggah file Excel. Unduh template terlebih dahulu untuk melihat format yang sesuai.</p>
                                    <div className="flex gap-3 mt-2">
                                        <button onClick={downloadTemplate} className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-primary border border-primary rounded-[var(--radius-sm)] hover:bg-gray-50 transition-colors font-medium text-xs">
                                            <span className="material-symbols-outlined text-[16px]">download</span>
                                            Download Template
                                        </button>
                                        <label className={`flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-xs transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press cursor-pointer ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <span className="material-symbols-outlined text-[16px]">{isImporting ? "hourglass_empty" : "upload"}</span>
                                            {isImporting ? "Mengimpor..." : "Upload Excel & Import"}
                                            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} disabled={isImporting} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                                </div>
                            )}

                            {showAIGenerate && (
                                <div className="p-6 space-y-5 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="col-span-1 md:col-span-3">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Topik / Materi</label>
                                        <textarea value={aiGenParams.topic} onChange={(e) => setAiGenParams(p => ({ ...p, topic: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300 resize-none" placeholder="Masukkan teks, topik, atau materi yang ingin dijadikan soal..."></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Tipe Soal</label>
                                        <Select2
                                            value={aiGenParams.type}
                                            onChange={(val) => setAiGenParams(p => ({ ...p, type: val as QuestionType }))}
                                            options={[
                                                { value: "multiple_choice", label: "Multiple Choice" },
                                                { value: "multiple_choice_weighted", label: "Weighted Choice" },
                                                { value: "essay", label: "Essay" },
                                                { value: "true_false", label: "True / False" },
                                                { value: "number_series", label: "Number Series" }
                                            ]}
                                            className="w-full text-left"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Tingkat Kesulitan</label>
                                        <Select2
                                            value={aiGenParams.difficulty}
                                            onChange={(val) => setAiGenParams(p => ({ ...p, difficulty: val as string }))}
                                            options={[
                                                { value: "Easy", label: "Mudah" },
                                                { value: "Medium", label: "Sedang" },
                                                { value: "Hard", label: "Sulit" }
                                            ]}
                                            className="w-full text-left"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Jumlah Soal</label>
                                        <input type="number" min="1" max="20" value={aiGenParams.count} onChange={(e) => setAiGenParams(p => ({ ...p, count: parseInt(e.target.value) || 5 }))} className="w-full h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary" />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={handleAIGenerate} disabled={isAIGenerating || !aiGenParams.topic} className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold text-sm transition-all shadow-[0_4px_15px_rgba(168,85,247,0.4)] hover:shadow-[0_6px_25px_rgba(168,85,247,0.6)] hover:translate-y-[-1px] btn-press disabled:opacity-50 disabled:cursor-not-allowed">
                                        <span className="material-symbols-outlined text-[16px]">{isAIGenerating ? "auto_awesome" : "smart_toy"}</span>
                                        {isAIGenerating ? "Generating..." : "Generate dengan AI"}
                                    </button>
                                </div>
                            </div>
                        )}
                            </div>
                        )}
                    </div>

                    {/* Questions List */}
                    {test.questions.length === 0 ? (
                        <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-[var(--color-text-muted)] block mb-2">quiz</span>
                            <p className="text-[var(--color-text-muted)] mb-2">No questions yet</p>
                            <p className="text-xs text-[var(--color-text-muted)]">Click &quot;Add New Question&quot; above to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {test.questions.map((q, idx) => {
                                const qType = questionTypeConfig[q.type];
                                const isEditing = editingQuestionId === q.id;

                                return (
                                    <div key={q.id} className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden transition-all duration-[250ms]">
                                        {isEditing ? (
                                            /* Edit mode */
                                            <div className="p-5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-primary">Editing Question #{idx + 1}</span>
                                                    <button onClick={() => setEditingQuestionId(null)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)]">Cancel</button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Type</label>
                                                        <Select2
                                                            value={editQuestion.type}
                                                            onChange={(val) => setEditQuestion((p) => ({ ...p, type: val as QuestionType }))}
                                                            options={Object.entries(questionTypeConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                                                            className="w-full text-left"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Competency</label>
                                                        <input type="text" value={editQuestion.competency} onChange={(e) => setEditQuestion((p) => ({ ...p, competency: e.target.value }))} className="w-full h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" placeholder="e.g. Integrity" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Time Limit (sec)</label>
                                                        <input type="number" value={editQuestion.timeLimit} onChange={(e) => setEditQuestion((p) => ({ ...p, timeLimit: parseInt(e.target.value) || 0 }))} className="w-full h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" min="0" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Question Text (Optional if image uploaded)</label>
                                                    <textarea value={editQuestion.text} onChange={(e) => setEditQuestion((p) => ({ ...p, text: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300 resize-none" />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Question Image (Optional)</label>
                                                    {editQuestion.imageUrl ? (
                                                        <div className="relative inline-block border border-[var(--color-border)] rounded-[var(--radius-sm)] p-1 bg-[var(--color-bg-elevated)]">
                                                            <img src={editQuestion.imageUrl} alt="Preview" className="max-h-32 object-contain rounded" />
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditQuestion(prev => ({ ...prev, imageUrl: "" }))}
                                                                className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 flex items-center justify-center shadow-lg transition-colors"
                                                                title="Remove Image"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-sub)] cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors">
                                                                <span className="material-symbols-outlined text-[18px]">image</span>
                                                                <span>Select Image</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleImageUpload(e, true)}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                            {uploadingImage && (
                                                                <span className="material-symbols-outlined text-[18px] text-[var(--color-text-muted)] animate-spin">
                                                                    progress_activity
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {editQuestion.type !== "essay" && editQuestion.type !== "likert_scale" && editQuestion.type !== "true_false" && (
                                                    <div className="space-y-1.5">
                                                        {editQuestion.options.map((opt, i) => {
                                                            const isImg = opt.startsWith("/");
                                                            return (
                                                                <div key={i} className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] w-4 text-center">{String.fromCharCode(65 + i)}</span>
                                                                    {isImg ? (
                                                                        <div className="flex-1 flex items-center gap-2 p-1 border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] h-8">
                                                                            <img src={opt} alt={`Option ${String.fromCharCode(65 + i)}`} className="h-full object-contain rounded" />
                                                                            <button type="button" onClick={() => { const o = [...editQuestion.options]; o[i] = ""; setEditQuestion((p) => ({ ...p, options: o })); }} className="text-red-500 hover:text-red-700 ml-auto p-1 flex items-center" title="Remove Option Image">
                                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <input value={opt} onChange={(e) => { const o = [...editQuestion.options]; o[i] = e.target.value; setEditQuestion((p) => ({ ...p, options: o })); }} className="flex-1 h-8 px-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" />
                                                                    )}

                                                                    {!isImg && (
                                                                        <label className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] cursor-pointer flex items-center" title="Upload Option Image">
                                                                            <span className="material-symbols-outlined text-[18px]">image</span>
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                onChange={async (e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (!file) return;
                                                                                    const formData = new FormData();
                                                                                    formData.append("file", file);
                                                                                    try {
                                                                                        const res = await fetch("/api/upload", { method: "POST", body: formData });
                                                                                        if (!res.ok) throw new Error("Upload failed");
                                                                                        const data = await res.json();
                                                                                        const o = [...editQuestion.options];
                                                                                        o[i] = data.imageUrl;
                                                                                        setEditQuestion((p) => ({ ...p, options: o }));
                                                                                    } catch (err) {
                                                                                        await globalDialog.alert("Upload failed");
                                                                                    }
                                                                                }}
                                                                                className="hidden"
                                                                            />
                                                                        </label>
                                                                    )}
                                                                    {editQuestion.type === "multiple_choice_weighted" ? (
                                                                        <input type="number" placeholder="Weight" value={editQuestion.optionWeights[String.fromCharCode(65 + i)] ?? ""} onChange={(e) => setEditQuestion(p => ({ ...p, optionWeights: { ...p.optionWeights, [String.fromCharCode(65 + i)]: parseInt(e.target.value) || 0 } }))} className="w-16 h-8 px-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-center focus:border-primary" />
                                                                    ) : (
                                                                        <button type="button" onClick={() => setEditQuestion((p) => ({ ...p, correctAnswer: String.fromCharCode(65 + i) }))} className={`p-1 rounded-[var(--radius-sm)] transition-colors ${editQuestion.correctAnswer === String.fromCharCode(65 + i) ? "text-[var(--color-success)] bg-[var(--color-success-light)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-success)]"}`}>
                                                                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingQuestionId(null)} className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] text-sm hover:bg-[var(--color-bg-hover)] transition-colors btn-press">Cancel</button>
                                                    <button onClick={handleSaveQuestion} className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white text-sm font-semibold shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press">Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View mode */
                                            <div className="p-5">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            <span className="flex-shrink-0 w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] flex items-center justify-center text-xs font-bold text-[var(--color-text-muted)]">{idx + 1}</span>
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]`}>
                                                                <span className="material-symbols-outlined text-[12px]">{qType.icon}</span>{qType.label}
                                                            </span>
                                                            {q.competency && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                                                    <span className="material-symbols-outlined text-[12px]">stars</span>{q.competency}
                                                                </span>
                                                            )}
                                                            {q.timeLimit && q.timeLimit > 0 && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
                                                                    <span className="material-symbols-outlined text-[12px]">timer</span>{q.timeLimit}s
                                                                </span>
                                                            )}
                                                            {q.correctAnswer && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--color-success-light)] text-[var(--color-success)]">
                                                                    <span className="material-symbols-outlined text-[12px]">check</span>Answer: {q.correctAnswer}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {q.text && <p className="text-sm text-[var(--color-text-main)] leading-relaxed">{q.text}</p>}
                                                        {q.imageUrl && (
                                                            <div className="mt-2">
                                                                <img src={q.imageUrl} alt="Question Illustration" className="max-h-40 object-contain rounded border border-[var(--color-border)]" />
                                                            </div>
                                                        )}

                                                        {/* Options display */}
                                                        {q.options.length > 0 && q.type !== "essay" && (
                                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                {q.options.map((opt, oi) => {
                                                                    const isImg = opt.startsWith("/");
                                                                    const isCorrect = q.correctAnswer === String.fromCharCode(65 + oi);
                                                                    const weight = q.optionWeights ? q.optionWeights[String.fromCharCode(65 + oi)] : undefined;
                                                                    const bgClass = q.type === "multiple_choice_weighted" ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border-l-4 border-l-primary" : (isCorrect ? "bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)]" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)]");
                                                                    
                                                                    return (
                                                                        <div key={oi} className={`flex items-center justify-between px-3 py-1.5 rounded-[var(--radius-sm)] text-xs ${bgClass}`}>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-bold text-[10px]">{String.fromCharCode(65 + oi)}</span>
                                                                                {isImg ? (
                                                                                    <img src={opt} alt={`Option ${String.fromCharCode(65 + oi)}`} className="max-h-16 object-contain rounded" />
                                                                                ) : (
                                                                                    <span>{opt}</span>
                                                                                )}
                                                                            </div>
                                                                            {q.type === "multiple_choice_weighted" && weight !== undefined && (
                                                                                <span className="font-bold text-primary ml-2 border border-primary px-1.5 py-0.5 rounded shadow-sm bg-[var(--color-bg-card)]">{weight}</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button onClick={() => startEditQuestion(q)} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-hover)] transition-colors" title="Edit">
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </button>
                                                        <button onClick={() => setDeleteQuestionTarget({ id: q.id, text: q.text })} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors" title="Delete">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ===== SCORING SCHEME & THRESHOLDS TAB ===== */}
            {activeTab === "scoring" && (
                <div className="space-y-6">
                    {/* Header & Presets Bar */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                                    Skema Penilaian & Standar Kelulusan (Multi-Tenant)
                                </h3>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                    Sesuaikan rentang nilai, label grade, ambang batas rekomendasi hiring, dan kompetensi kunci (gatekeeper) sesuai standar perusahaan Anda.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-[var(--color-text-sub)]">Template Preset:</span>
                                <button
                                    type="button"
                                    onClick={() => handleApplyPreset("5_tier_sales")}
                                    className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all border ${selectedPreset === "5_tier_sales" ? "bg-primary text-white border-primary shadow-xs" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"}`}
                                >
                                    🎯 5-Tier Standard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleApplyPreset("3_tier_simple")}
                                    className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all border ${selectedPreset === "3_tier_simple" ? "bg-primary text-white border-primary shadow-xs" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"}`}
                                >
                                    📊 3-Tier Simple
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleApplyPreset("academic_grade")}
                                    className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all border ${selectedPreset === "academic_grade" ? "bg-primary text-white border-primary shadow-xs" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-sub)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"}`}
                                >
                                    🏆 Academic Grade (A-E)
                                </button>
                            </div>
                        </div>

                        {/* Scheme Name input */}
                        <div className="pt-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Nama Skema Penilaian</label>
                            <input
                                type="text"
                                value={scoringConfig.schemeName || ""}
                                onChange={(e) => setScoringConfig(prev => ({ ...prev, schemeName: e.target.value }))}
                                placeholder="e.g. Standar Penilaian Rekrutmen Sales 2026"
                                className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all"
                            />
                        </div>
                    </div>

                    {/* Section 1: Score Category Bands */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-amber-500">category</span>
                                    1. Rentang Nilai & Kategori Grade (Score Bands)
                                </h4>
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                    Tentukan pembagian kelompok nilai dari skor 0 hingga 100 beserta nama labelnya.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setScoringConfig(prev => ({
                                        ...prev,
                                        bands: [...(prev.bands || []), { min: 0, max: 50, label: "CUSTOM GRADE", description: "" }]
                                    }));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-[var(--color-primary-light)] text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Tambah Rentang
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)] text-[11px] font-bold uppercase text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)]">
                                        <th className="p-2.5 w-24">Min (%)</th>
                                        <th className="p-2.5 w-24">Max (%)</th>
                                        <th className="p-2.5 w-48">Nama Label Kategori</th>
                                        <th className="p-2.5">Deskripsi / Keterangan</th>
                                        <th className="p-2.5 w-16 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(scoringConfig.bands || []).map((band, idx) => (
                                        <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={band.min}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setScoringConfig(prev => {
                                                            const newBands = [...(prev.bands || [])];
                                                            newBands[idx] = { ...newBands[idx], min: val };
                                                            return { ...prev, bands: newBands };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                    min="0"
                                                    max="100"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={band.max}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setScoringConfig(prev => {
                                                            const newBands = [...(prev.bands || [])];
                                                            newBands[idx] = { ...newBands[idx], max: val };
                                                            return { ...prev, bands: newBands };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                    min="0"
                                                    max="100"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={band.label}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setScoringConfig(prev => {
                                                            const newBands = [...(prev.bands || [])];
                                                            newBands[idx] = { ...newBands[idx], label: val };
                                                            return { ...prev, bands: newBands };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)]"
                                                    placeholder="e.g. HIGH"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={band.description || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setScoringConfig(prev => {
                                                            const newBands = [...(prev.bands || [])];
                                                            newBands[idx] = { ...newBands[idx], description: val };
                                                            return { ...prev, bands: newBands };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-sub)]"
                                                    placeholder="Keterangan kategori..."
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setScoringConfig(prev => ({
                                                            ...prev,
                                                            bands: (prev.bands || []).filter((_, i) => i !== idx)
                                                        }));
                                                    }}
                                                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors"
                                                    title="Hapus Baris"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 2: Competency Status Rules */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-blue-500">stars</span>
                                    2. Aturan Status Tingkat Perkembangan (Competency Status)
                                </h4>
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                    Atur status dan rentang skor untuk status perkembangan kompetensi (misal: Key Strength, Strength, Adequate, Development Area, Critical Development).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setScoringConfig(prev => ({
                                        ...prev,
                                        statusBands: [...(prev.statusBands || DEFAULT_STATUS_BANDS), { min: 0, max: 59, label: "Critical Development", description: "Area kritis membutuhkan pengembangan.", color: "rose" }]
                                    }));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-[var(--color-primary-light)] text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Tambah Baris
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)] text-[11px] font-bold uppercase text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)]">
                                        <th className="p-2.5 w-24">Min (%)</th>
                                        <th className="p-2.5 w-24">Max (%)</th>
                                        <th className="p-2.5 w-52">Label Status</th>
                                        <th className="p-2.5">Keterangan Status</th>
                                        <th className="p-2.5 w-16 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(scoringConfig.statusBands || DEFAULT_STATUS_BANDS).map((sBand, idx) => (
                                        <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={sBand.min}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setScoringConfig(prev => {
                                                            const newBands = [...(prev.statusBands || DEFAULT_STATUS_BANDS)];
                                                            newBands[idx] = { ...newBands[idx], min: val };
                                                            return { ...prev, statusBands: newBands };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                    min="0"
                                                    max="100"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={sBand.max}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setScoringConfig(prev => {
                                                            const newBands = [...(prev.statusBands || DEFAULT_STATUS_BANDS)];
                                                            newBands[idx] = { ...newBands[idx], max: val };
                                                            return { ...prev, statusBands: newBands };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                    min="0"
                                                    max="100"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={sBand.label}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setScoringConfig(prev => {
                                                            const newBands = [...(prev.statusBands || DEFAULT_STATUS_BANDS)];
                                                            newBands[idx] = { ...newBands[idx], label: val };
                                                            return { ...prev, statusBands: newBands };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)]"
                                                    placeholder="e.g. Key Strength"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={sBand.description || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setScoringConfig(prev => {
                                                            const newBands = [...(prev.statusBands || DEFAULT_STATUS_BANDS)];
                                                            newBands[idx] = { ...newBands[idx], description: val };
                                                            return { ...prev, statusBands: newBands };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-sub)]"
                                                    placeholder="Keterangan status..."
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setScoringConfig(prev => ({
                                                            ...prev,
                                                            statusBands: (prev.statusBands || DEFAULT_STATUS_BANDS).filter((_, i) => i !== idx)
                                                        }));
                                                    }}
                                                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors"
                                                    title="Hapus Baris"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 3: Hiring Recommendations Rules */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-emerald-500">verified</span>
                                    3. Aturan Rekomendasi Perekrutan (Hiring Decisions)
                                </h4>
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                    Tentukan kriteria kelulusan berdasarkan Overall Score kandidat.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setScoringConfig(prev => ({
                                        ...prev,
                                        recommendations: [...(prev.recommendations || []), { type: "CUSTOM", label: "Disarankan", minOverallScore: 70, description: "" }]
                                    }));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-[var(--color-primary-light)] text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Tambah Aturan
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)] text-[11px] font-bold uppercase text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)]">
                                        <th className="p-2.5 w-28">Min Score (%)</th>
                                        <th className="p-2.5 w-60">Label Rekomendasi</th>
                                        <th className="p-2.5">Penjelasan / Rationale</th>
                                        <th className="p-2.5 w-16 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(scoringConfig.recommendations || []).map((rec, idx) => (
                                        <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={rec.minOverallScore}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setScoringConfig(prev => {
                                                            const newRecs = [...(prev.recommendations || [])];
                                                            newRecs[idx] = { ...newRecs[idx], minOverallScore: val };
                                                            return { ...prev, recommendations: newRecs };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                    min="0"
                                                    max="100"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={rec.label}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setScoringConfig(prev => {
                                                            const newRecs = [...(prev.recommendations || [])];
                                                            newRecs[idx] = { ...newRecs[idx], label: val };
                                                            return { ...prev, recommendations: newRecs };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)]"
                                                    placeholder="e.g. Recommended"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={rec.description || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setScoringConfig(prev => {
                                                            const newRecs = [...(prev.recommendations || [])];
                                                            newRecs[idx] = { ...newRecs[idx], description: val };
                                                            return { ...prev, recommendations: newRecs };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-sub)]"
                                                    placeholder="Alasan / tindak lanjut rekomendasi..."
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setScoringConfig(prev => ({
                                                            ...prev,
                                                            recommendations: (prev.recommendations || []).filter((_, i) => i !== idx)
                                                        }));
                                                    }}
                                                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors"
                                                    title="Hapus Aturan"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 4: Gatekeeper Rules */}
                    <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-purple-500">policy</span>
                                    4. Syarat Mutlak & Batas Kritis (Gatekeeper Rules)
                                </h4>
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                    Kompetensi yang wajib lolos. Jika skor di bawah batas minimal, sistem otomatis memberi peringatan *"Deep Dive Review"*.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setScoringConfig(prev => ({
                                        ...prev,
                                        gatekeepers: [...(prev.gatekeepers || []), { competency: "Integrity", minScore: 80, action: "DEEP_DIVE", actionLabel: "Wawancara Khusus" }]
                                    }));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-[var(--color-primary-light)] text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Tambah Gatekeeper
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)] text-[11px] font-bold uppercase text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)]">
                                        <th className="p-2.5 w-60">Nama Kompetensi Kunci</th>
                                        <th className="p-2.5 w-28">Batas Min (%)</th>
                                        <th className="p-2.5">Status / Aksi Jika Gagal (Custom Name)</th>
                                        <th className="p-2.5 w-16 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(scoringConfig.gatekeepers || []).map((gate, idx) => (
                                        <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={gate.competency}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setScoringConfig(prev => {
                                                            const newGates = [...(prev.gatekeepers || [])];
                                                            newGates[idx] = { ...newGates[idx], competency: val };
                                                            return { ...prev, gatekeepers: newGates };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)]"
                                                    placeholder="e.g. Integrity, Compliance"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={gate.minScore}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setScoringConfig(prev => {
                                                            const newGates = [...(prev.gatekeepers || [])];
                                                            newGates[idx] = { ...newGates[idx], minScore: val };
                                                            return { ...prev, gatekeepers: newGates };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-main)] text-center font-mono"
                                                    min="0"
                                                    max="100"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={gate.actionLabel || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setScoringConfig(prev => {
                                                            const newGates = [...(prev.gatekeepers || [])];
                                                            newGates[idx] = { ...newGates[idx], actionLabel: val };
                                                            return { ...prev, gatekeepers: newGates };
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-main)]"
                                                    placeholder="e.g. Wawancara Khusus / Review Lanjutan"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setScoringConfig(prev => ({
                                                            ...prev,
                                                            gatekeepers: (prev.gatekeepers || []).filter((_, i) => i !== idx)
                                                        }));
                                                    }}
                                                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-danger-light)] transition-colors"
                                                    title="Hapus Gatekeeper"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Save Bar */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => handleApplyPreset("5_tier_sales")}
                            className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-colors btn-press"
                        >
                            Reset ke Standar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[18px]">{saving ? "progress_activity" : "check"}</span>
                            {saving ? "Menyimpan Skema..." : "Simpan Skema Penilaian"}
                        </button>
                    </div>
                </div>
            )}

            {/* ===== SETTINGS TAB ===== */}
            {activeTab === "settings" && (
                <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Test Name</label>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Category</label>
                            <Select2
                                value={editCategory}
                                onChange={(val) => setEditCategory(val as TestCategory)}
                                options={Object.entries(categoryConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                                className="w-full text-left"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Question Type</label>
                            <Select2
                                value={editQuestionType}
                                onChange={(val) => setEditQuestionType(val as QuestionType)}
                                options={Object.entries(questionTypeConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                                className="w-full text-left"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Duration (minutes)</label>
                            <input type="number" value={editDuration} onChange={(e) => setEditDuration(parseInt(e.target.value) || 0)} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" min="1" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5" title="Berapa banyak soal yang akan digunakan dari total bank soal">Soal Digunakan (0=Semua)</label>
                            <input type="number" value={editTotalQuestions} onChange={(e) => setEditTotalQuestions(parseInt(e.target.value) || 0)} className="w-full h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300" min="0" placeholder="0 = Gunakan Semua" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Description</label>
                        <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-primary focus:ring-4 focus:ring-[var(--color-primary-light)] transition-all duration-300 resize-none" />
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        <div>
                            <p>Created: {new Date(test.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                            <p>Status: <span className="font-medium">{st.label}</span> • Questions: <span className="font-medium">{test.questions.length}</span></p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => { setEditName(test.name); setEditCategory(test.category); setEditQuestionType(test.questionType); setEditDescription(test.description || ""); setEditDuration(test.duration); setEditTotalQuestions(test.totalQuestionsToUse); }} className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-primary border border-[var(--color-border-accent)] font-medium text-sm hover:bg-[var(--color-bg-hover)] transition-colors btn-press">
                            Reset
                        </button>
                        <button onClick={handleSave} disabled={saving || !editName} className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-accent text-white font-semibold text-sm transition-all shadow-[0_4px_15px_var(--color-primary-glow)] hover:shadow-[0_6px_25px_var(--color-primary-glow)] hover:translate-y-[-1px] btn-press disabled:opacity-50 disabled:cursor-not-allowed">
                            <span className="material-symbols-outlined text-[18px]">{saving ? "progress_activity" : "check"}</span>
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Question Confirmation */}
            <ConfirmDialog
                open={!!deleteQuestionTarget}
                title="Delete Question"
                message={`Are you sure you want to delete this question? "${deleteQuestionTarget?.text?.substring(0, 80)}${(deleteQuestionTarget?.text?.length ?? 0) > 80 ? "..." : ""}" This action cannot be undone.`}
                confirmLabel="Delete Question"
                variant="danger"
                onCancel={() => setDeleteQuestionTarget(null)}
                onConfirm={() => {
                    if (deleteQuestionTarget) {
                        handleDeleteQuestion(deleteQuestionTarget.id);
                        setDeleteQuestionTarget(null);
                    }
                }}
            />
        </>
    );
}
