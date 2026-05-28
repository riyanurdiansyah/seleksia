"use client";

import Link from "next/link";
import { useState } from "react";

export default function ResultDetailClient({ data }: { data: any }) {
    const [viewMode, setViewMode] = useState<"overview" | "answers" | "violations">("overview");

    const m = Math.floor(data.examSession.timeUsedSeconds / 60);
    const s = data.examSession.timeUsedSeconds % 60;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/admin/results" className="p-2 rounded-lg bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Test Report</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detailed performance and security insights.</p>
                </div>
            </div>

            {/* Candidate & Test Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Candidate Info */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm p-6 flex items-start gap-4">
                    <div className="size-14 rounded-full bg-gradient-to-br from-brand-teal to-primary text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20 flex-shrink-0">
                        {data.candidate.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{data.candidate.name}</h2>
                        <div className="flex flex-col gap-1 mt-2 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">badge</span> {data.candidate.displayId}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">mail</span> {data.candidate.email}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">domain</span> Batch {data.candidate.batch || "-"}</span>
                        </div>
                    </div>
                </div>

                {/* Score & Timing */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm p-6 flex flex-col justify-center">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Test Score</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-4xl font-black ${data.calculatedScore >= 60 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                                    {data.calculatedScore}%
                                </span>
                            </div>
                        </div>
                        <div className={`p-4 rounded-xl flex items-center justify-center ${data.calculatedScore >= 60 ? "bg-green-50 dark:bg-green-900/20 text-green-600" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600"}`}>
                            <span className="material-symbols-outlined text-[32px]">workspace_premium</span>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-4 text-sm text-slate-600 dark:text-slate-300">
                        <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Time Spent</span>
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{m}m {s}s</span>
                        </div>
                        <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Duration Limit</span>
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{data.test.duration}m</span>
                        </div>
                        {data.examSession.autoSubmitted && (
                            <span className="ml-auto inline-flex self-center px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-semibold">
                                Force Submitted
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
                {[
                    { id: "overview", label: "Overview", icon: "dashboard" },
                    { id: "answers", label: "Answer Breakdown", icon: "fact_check" },
                    { id: "violations", label: `Violations (${data.violations.length})`, icon: "gavel", alert: data.violations.length > 0 }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${viewMode === tab.id ? "bg-white dark:bg-surface-dark shadow-sm text-primary" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                        {tab.label}
                        {tab.alert && <span className="size-2 rounded-full bg-red-500 ml-1 shadow-sm shadow-red-500/50 block"></span>}
                    </button>
                ))}
            </div>

            {/* Dynamic Content */}
            {viewMode === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
                    <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Test Details</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                                <div><span className="text-xs text-slate-500 block mb-1">Test Name</span><span className="font-semibold text-slate-900 dark:text-white">{data.test.name}</span></div>
                                <div><span className="text-xs text-slate-500 block mb-1">Category</span><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">{data.test.category}</span></div>
                            </div>
                            <div className="grid grid-cols-2 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                                <div><span className="text-xs text-slate-500 block mb-1">Total Questions</span><span className="font-mono text-slate-900 dark:text-white text-lg">{data.test.totalQuestions}</span></div>
                                <div><span className="text-xs text-slate-500 block mb-1">Device/Browser Hash</span><span className="font-mono text-slate-500 dark:text-slate-400 text-xs truncate max-w-[200px] block">{data.examSession.deviceFingerprint || "N/A"}</span></div>
                            </div>
                            <div className="grid grid-cols-2 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                                <div><span className="text-xs text-slate-500 block mb-1">Started At</span><span className="text-sm font-medium text-slate-900 dark:text-white">{data.startedAt ? new Date(data.startedAt).toLocaleString() : "-"}</span></div>
                                <div><span className="text-xs text-slate-500 block mb-1">Completed At</span><span className="text-sm font-medium text-slate-900 dark:text-white">{data.completedAt ? new Date(data.completedAt).toLocaleString() : "-"}</span></div>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-1 bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Security Context</h3>
                        {data.violations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="size-16 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 flex items-center justify-center mb-4"><span className="material-symbols-outlined text-[32px]">shield</span></div>
                                <p className="font-semibold text-slate-900 dark:text-white mb-1">All Clear</p>
                                <p className="text-xs text-slate-500">No anomalous behavior detected.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="size-16 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center mb-4"><span className="material-symbols-outlined text-[32px]">warning</span></div>
                                <p className="font-semibold text-red-600 dark:text-red-400 mb-1">{data.violations.length} Flags Raised</p>
                                <p className="text-xs text-slate-500 px-4">The proctoring system caught some odd behaviors. Check the specific Violations tab.</p>
                                <button onClick={() => setViewMode("violations")} className="mt-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 transition-colors text-sm font-bold">Review Violations</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewMode === "answers" && (
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-sm animate-slide-up">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Answers Breakdown</h3>
                    <div className="space-y-4">
                        {data.answers.map((ans: any, idx: number) => (
                            <div key={ans.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                {/* Indicator Stripe */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${ans.isCorrect ? "bg-green-500" : (ans.candidateAnswer ? "bg-red-500" : "bg-slate-300 dark:bg-slate-700")}`}></div>

                                <div className="pl-3 flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold font-mono text-slate-500 mb-2">QUESTION {idx + 1}</p>
                                        <p className="font-medium text-slate-900 dark:text-white mb-4" dangerouslySetInnerHTML={{ __html: ans.text }}></p>

                                        {ans.imageUrl && (
                                            <div className="mt-2 mb-4 bg-slate-50 dark:bg-slate-800 rounded p-2 inline-block">
                                                <img src={ans.imageUrl} alt="Question context" className="max-h-32 rounded" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="md:w-64 flex-shrink-0 flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg h-fit">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">User Selected</span>
                                            {ans.candidateAnswer ? (
                                                <div className={`text-sm font-bold px-3 py-1.5 rounded flex items-center gap-2 ${ans.isCorrect ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                                    {ans.isCorrect ? <span className="material-symbols-outlined text-[16px]">check_circle</span> : <span className="material-symbols-outlined text-[16px]">cancel</span>}
                                                    {ans.candidateAnswer} (Option)
                                                </div>
                                            ) : (
                                                <div className="text-sm font-semibold px-3 py-1.5 rounded flex items-center gap-2 bg-slate-200/50 dark:bg-slate-700 text-slate-500 italic">
                                                    Skipped / Blank
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 mt-2">Correct Answer</span>
                                            <div className="text-sm font-bold px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                                {ans.correctAnswer || "Not set/Essay"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewMode === "violations" && (
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-sm animate-slide-up">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Proctoring Logs</h3>
                    {data.violations.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                            No violations found in the logs!
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.violations.map((v: any, idx: number) => (
                                <div key={v.id} className="flex flex-col sm:flex-row gap-4 p-4 border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 rounded-xl relative group">
                                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined">{v.type.includes('face') ? 'face' : v.type.includes('tab') || v.type.includes('blur') ? 'tab' : 'warning'}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-bold text-slate-900 dark:text-white capitalize">{v.type.replace(/_/g, ' ')}</p>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v.severity >= 3 ? "bg-red-600 text-white" : v.severity === 2 ? "bg-orange-500 text-white" : "bg-yellow-400 text-slate-900"}`}>
                                                Lvl {v.severity}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{v.description || "No specific details logged."}</p>
                                    </div>
                                    <div className="sm:text-right">
                                        <span className="text-xs font-mono text-slate-500 block mb-1">TIME DETECTED</span>
                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{new Date(v.detectedAt).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
