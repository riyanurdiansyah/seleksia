"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { globalDialog } from "@/app/providers/DialogProvider";

interface ChatMessage {
  role: "ai" | "user";
  content: string;
}

interface InterviewTrackerProps {
  candidateId: string;
  onAnalysisComplete?: () => void;
}

type InterviewState = "IDLE" | "STARTING" | "AI_THINKING" | "AI_SPEAKING" | "CANDIDATE_SPEAKING" | "FINISHED";

export default function InterviewTracker({ candidateId, onAnalysisComplete }: InterviewTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [interviewState, setInterviewState] = useState<InterviewState>("IDLE");
  const stateRef = useRef<InterviewState>("IDLE");
  
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  const toggleMute = () => {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      isMutedRef.current = newMuted;

      if (newMuted) {
          if (recognitionRef.current) recognitionRef.current.stop();
      } else {
          if (recognitionRef.current && stateRef.current !== "IDLE" && stateRef.current !== "FINISHED") {
              try { recognitionRef.current.start(); } catch(e) {}
          }
      }
  };

  const updateState = (newState: InterviewState) => {
    setInterviewState(newState);
    stateRef.current = newState;
  };

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatHistoryRef = useRef<ChatMessage[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState("");
  
  // Web Speech API references
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const transcriptionRef = useRef(""); 
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // We need a stable reference to sendToAI for the silence timeout
  const sendToAIRef = useRef<((msg: string | null) => Promise<void>) | null>(null);

  useEffect(() => {
    // Init TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Init STT
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'id-ID'; 

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            } else {
              interimTranscript += event.results[i][0].transcript + ' ';
            }
          }
          
          if (finalTranscript) {
            transcriptionRef.current += finalTranscript;
          }
          
          const activeText = transcriptionRef.current + interimTranscript;
          setCurrentTranscription(activeText);

          // 2. Silence Detection (Auto-Send)
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          
          if (stateRef.current === "CANDIDATE_SPEAKING" && !isMutedRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              const finalAnswer = transcriptionRef.current.trim();
              if (finalAnswer && sendToAIRef.current) {
                sendToAIRef.current(finalAnswer);
              }
            }, 3000); // 3 seconds of silence triggers auto-send
          }
        };
        
        recognitionRef.current.onerror = (event: any) => {
          if (event.error === 'no-speech') {
            // Ignore no-speech, it just means the user is silent
          } else if (event.error === 'aborted') {
            // Ignore aborts
          } else {
            console.warn("Speech recognition error:", event.error);
          }
        };

        // Keep recognition alive unless we are finished, IDLE, or explicitly muted
        recognitionRef.current.onend = () => {
          if (stateRef.current !== "IDLE" && stateRef.current !== "FINISHED" && stateRef.current !== "STARTING" && !isMutedRef.current) {
             try {
                recognitionRef.current.start();
             } catch(e) {}
          }
        };
      }
    }
    
    return () => stopAll();
  }, []);

  const stopAll = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
    }
    if (synthRef.current) synthRef.current.cancel();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  const startInterview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      updateState("STARTING");
      
      // Start listening immediately so we can catch interruptions from the very first AI message
      if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch(e){}
      }

      await sendToAI(null);
    } catch (err) {
      console.error("Failed to start:", err);
      globalDialog.alert("Gagal mengakses kamera atau microphone. Pastikan izin telah diberikan.");
    }
  };

  const sendToAI = async (message: string | null) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    updateState("AI_THINKING");
    if (message) {
        const newHistory: ChatMessage[] = [...chatHistoryRef.current, { role: "user", content: message }];
        setChatHistory(newHistory);
        chatHistoryRef.current = newHistory;
    }
    setCurrentTranscription("");
    transcriptionRef.current = "";

    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, message })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      const aiHistory: ChatMessage[] = [...chatHistoryRef.current, { role: "ai", content: data.speech }];
      setChatHistory(aiHistory);
      chatHistoryRef.current = aiHistory;

      if (data.isFinished) {
        speakAI(data.speech, () => {
          updateState("FINISHED");
          stopAll();
          onAnalysisComplete?.();
        });
      } else {
        speakAI(data.speech, () => {
          // Once AI finishes speaking normally, candidate's turn starts
          if (stateRef.current !== "CANDIDATE_SPEAKING") {
             updateState("CANDIDATE_SPEAKING");
          }
        });
      }

    } catch (error) {
      console.error(error);
      globalDialog.alert("Terjadi kesalahan komunikasi dengan AI.");
      updateState("FINISHED");
    }
  };

  // Keep a stable ref to sendToAI for the timeout closure
  useEffect(() => {
      sendToAIRef.current = sendToAI;
  }, [candidateId]); // Removed chatHistory dependency since we use chatHistoryRef now

  const speakAI = (text: string, onEnd: () => void) => {
    updateState("AI_SPEAKING");
    
    // Stop microphone to prevent AI from hearing itself (echo)
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      utterance.onend = () => {
          if (stateRef.current === "AI_SPEAKING") {
              onEnd();
          }
      };
      
      utterance.onerror = () => {
          if (stateRef.current === "AI_SPEAKING") onEnd();
      };

      synthRef.current.speak(utterance);
    } else {
      setTimeout(onEnd, 2000);
    }
  };

  const manualInterrupt = () => {
      if (synthRef.current) synthRef.current.cancel();
      updateState("CANDIDATE_SPEAKING");
      if (recognitionRef.current && !isMutedRef.current) {
          try { recognitionRef.current.start(); } catch(e) {}
      }
  };

  return (
    <div className="bg-white dark:bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col md:flex-row h-[600px]">
      
      {/* Video Side */}
      <div className="w-full md:w-1/2 bg-black relative flex flex-col">
        {!videoRef.current?.srcObject && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-10">
            <span className="material-symbols-outlined text-4xl mb-2">videocam_off</span>
            <p>Kamera Nonaktif</p>
          </div>
        )}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={"w-full h-full object-cover " + (interviewState === "IDLE" ? 'opacity-0' : 'opacity-100')}
        />

        {/* State Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
            <div className={"px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 " + (
                interviewState === "CANDIDATE_SPEAKING" ? "bg-red-600 text-white animate-pulse" : 
                interviewState === "AI_SPEAKING" ? "bg-blue-600 text-white" : 
                "bg-black/50 text-white/80 backdrop-blur-sm"
            )}>
                {interviewState === "IDLE" && "SIAP"}
                {interviewState === "STARTING" && "MEMULAI..."}
                {interviewState === "AI_THINKING" && <><span className="material-symbols-outlined text-[14px] animate-spin">sync</span> AI BERPIKIR...</>}
                {interviewState === "AI_SPEAKING" && <><span className="material-symbols-outlined text-[14px]">record_voice_over</span> AI BERBICARA</>}
                {interviewState === "CANDIDATE_SPEAKING" && <><div className="w-2 h-2 bg-white rounded-full"></div> GILIRAN ANDA</>}
                {interviewState === "FINISHED" && "SELESAI"}
            </div>
            
            {/* Mute Button Overlay */}
            {interviewState !== "IDLE" && interviewState !== "STARTING" && interviewState !== "FINISHED" && (
                <button 
                    onClick={toggleMute}
                    className={"w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors shadow-lg " + (
                        isMuted ? 'bg-red-600 text-white' : 'bg-black/50 text-white hover:bg-black/70'
                    )}
                    title={isMuted ? "Nyalakan Mikrofon" : "Matikan Mikrofon"}
                >
                    <span className="material-symbols-outlined">
                        {isMuted ? 'mic_off' : 'mic'}
                    </span>
                </button>
            )}
        </div>

        {/* Action Buttons */}
        {interviewState === "IDLE" && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60">
                <button onClick={startInterview} className="px-6 py-3 bg-primary text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                    <span className="material-symbols-outlined">play_arrow</span> Mulai Wawancara
                </button>
            </div>
        )}

        {/* Manual Interrupt Button */}
        {interviewState === "AI_SPEAKING" && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
                <button onClick={manualInterrupt} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-fade-in transition-colors">
                    <span className="material-symbols-outlined text-[14px]">front_hand</span>
                    Sela Pembicaraan (Interupsi)
                </button>
            </div>
        )}
        
        {/* Candidate Controls: Mute Status and Manual Submit */}
        {interviewState === "CANDIDATE_SPEAKING" && (
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 z-20">
                <button 
                    onClick={() => {
                        const finalAnswer = transcriptionRef.current.trim();
                        if (finalAnswer) sendToAI(finalAnswer);
                    }}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-bold shadow-xl flex items-center gap-2 animate-fade-in transition-transform hover:scale-105"
                >
                    <span className="material-symbols-outlined">send</span>
                    Selesai Menjawab
                </button>
                <div className="px-4 py-1.5 bg-black/50 backdrop-blur-sm text-white/80 rounded-full text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                        {isMuted ? 'mic_off' : 'mic'}
                    </span>
                    {isMuted ? "Mikrofon Dimatikan." : "Atau diam 3 detik untuk kirim otomatis."}
                </div>
            </div>
        )}
      </div>

      {/* AI / Chat Side */}
      <div className="w-full md:w-1/2 flex flex-col bg-gray-50 dark:bg-[#111]">
        
        {/* AI Avatar Video Call Simulation */}
        <div className="h-48 md:h-64 relative overflow-hidden bg-white border-b border-[var(--color-border)] shrink-0">
            <img 
                src="/images/ai-hr.jpg" 
                alt="AI Recruiter" 
                className={"w-full h-full object-cover object-top transition-all duration-500 " + 
                    (interviewState === "AI_SPEAKING" ? "scale-[1.03]" : "scale-100 grayscale-[10%]")
                }
            />
            
            {/* Overlay glow when speaking */}
            <div className={"absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 " + (interviewState === "AI_SPEAKING" ? "opacity-100" : "opacity-70")}></div>

            {/* Visualizer / Status Badge */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2">
                {interviewState === "AI_SPEAKING" ? (
                    <>
                        <div className="flex gap-1 items-center h-3">
                            <span className="w-1 bg-green-400 rounded-full h-full animate-[pulse_0.5s_infinite]"></span>
                            <span className="w-1 bg-green-400 rounded-full h-1/2 animate-[pulse_0.7s_infinite_0.1s]"></span>
                            <span className="w-1 bg-green-400 rounded-full h-3/4 animate-[pulse_0.4s_infinite_0.2s]"></span>
                            <span className="w-1 bg-green-400 rounded-full h-1/3 animate-[pulse_0.6s_infinite_0.3s]"></span>
                        </div>
                        Berbicara...
                    </>
                ) : interviewState === "AI_THINKING" ? (
                    <>
                        <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                        Berpikir...
                    </>
                ) : (
                    <>
                        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                        Mendengarkan
                    </>
                )}
            </div>
            
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg border border-white/10">
                Bu Sarah (AI Recruiter)
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, i) => (
                <div key={i} className={"flex flex-col " + (msg.role === 'user' ? 'items-end' : 'items-start')}>
                    <span className="text-[10px] text-[var(--color-text-muted)] mb-1 uppercase font-bold tracking-wider">
                        {msg.role === 'user' ? 'Anda' : 'AI'}
                    </span>
                    <div className={"max-w-[85%] p-3 rounded-2xl text-sm " + (
                        msg.role === 'user' 
                            ? 'bg-primary text-white rounded-tr-none' 
                            : 'bg-white dark:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-tl-none'
                    )}>
                        {msg.content}
                    </div>
                </div>
            ))}
            
            {/* Live Transcription Box */}
            {(interviewState === "CANDIDATE_SPEAKING" || currentTranscription) && (
                <div className="flex flex-col items-end animate-fade-in">
                    <span className="text-[10px] text-green-600 font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>
                        Mendengarkan...
                    </span>
                    <div className="max-w-[85%] p-3 rounded-2xl text-sm bg-primary/20 border border-primary/30 text-[var(--color-text-main)] rounded-tr-none italic">
                        {currentTranscription || "..."}
                    </div>
                </div>
            )}
            
            {/* AI Typing Indicator */}
            {interviewState === "AI_THINKING" && (
                <div className="flex flex-col items-start animate-fade-in">
                    <span className="text-[10px] text-[var(--color-text-muted)] mb-1 uppercase font-bold tracking-wider">AI</span>
                    <div className="max-w-[85%] p-3 rounded-2xl bg-white dark:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-tl-none">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
