"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import InterviewTracker from "@/components/InterviewTracker";
import { globalDialog } from "@/app/providers/DialogProvider";
import ReactMarkdown from 'react-markdown';

export default function CandidateInterviewPage() {
  const { id } = useParams();
  const [sessionData, setSessionData] = useState<any>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    // Check if candidate has an active schedule
    if (id) {
        fetch(`/api/interview/check-schedule?candidateId=${id}`)
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    setScheduleError(data.error || "Gagal memverifikasi jadwal wawancara.");
                }
            })
            .catch(() => {
                // Ignore API failures and let them through for robustness, 
                // or you could block them. We'll be lenient if API fails.
            });
    }
  }, [id]);

  if (!id) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Sesi Wawancara AI</h1>
          <p className="text-[var(--color-text-muted)]">
            Silakan jawab pertanyaan dengan jelas. AI akan merekam suara dan ekspresi Anda.
          </p>
        </div>

        {scheduleError ? (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-[var(--radius-lg)] border border-red-200 dark:border-red-800 text-center">
                <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
                <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
                <p>{scheduleError}</p>
            </div>
        ) : !sessionData ? (
          <InterviewTracker 
            candidateId={id as string} 
            onAnalysisComplete={(data) => {
              setSessionData(data);
              globalDialog.alert("Wawancara Selesai! Laporan AI telah dibuat.");
            }} 
          />
        ) : (
          <div className="bg-white dark:bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm p-6 space-y-6">
            <h2 className="text-xl font-bold text-green-600 flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              Analisis Selesai
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-sm uppercase text-[var(--color-text-muted)] mb-2">Transkrip (Apa yang diucapkan)</h3>
                <div className="bg-[var(--color-bg-elevated)] p-4 rounded-md border border-[var(--color-border)] text-sm">
                  {sessionData.transcription}
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-sm uppercase text-[var(--color-text-muted)] mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                  Laporan Deteksi Perilaku (AI)
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800 text-sm">
                  <div className="prose dark:prose-invert max-w-none text-[14px]">
                    <ReactMarkdown>{sessionData.aiAnalysisReport}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
