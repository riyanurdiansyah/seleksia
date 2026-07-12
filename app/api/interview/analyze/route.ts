import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

async function getAIConfig() {
  try {
    const settings = await prisma.platformSetting.findMany({
      where: {
        key: { in: ['ANTHROPIC_MODEL', 'ANTHROPIC_MAX_TOKENS', 'ANTHROPIC_TEMPERATURE'] }
      }
    });
    
    const model = settings.find(s => s.key === 'ANTHROPIC_MODEL')?.value || process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
    const tokensStr = settings.find(s => s.key === 'ANTHROPIC_MAX_TOKENS')?.value;
    const max_tokens = tokensStr ? parseInt(tokensStr) : 2048;
    const tempStr = settings.find(s => s.key === 'ANTHROPIC_TEMPERATURE')?.value;
    const temperature = tempStr ? parseFloat(tempStr) : 0.5;

    return { model, max_tokens, temperature };
  } catch (error) {
    return {
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 2048,
      temperature: 0.5,
    };
  }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidateId, transcription, emotionLog } = body;

        if (!candidateId) {
            return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
        }

        const aiConfig = await getAIConfig();

        const systemPrompt = `You are an expert HR Interview Profiler and Behavioral Psychologist.
Your task is to analyze a candidate's online interview data to detect potential exaggeration, extreme nervousness, or signs of deception.

You will be provided with:
1. TRANSCRIPTION: What the candidate said.
2. EMOTION LOG: A high-level summary of their facial expressions and head movements detected during the interview (e.g., looking away frequently, high stress, smiling).

Please analyze the linguistic patterns (e.g., use of passive voice, over-justification, lack of detail) combined with the visual cues (e.g., gaze aversion when answering specific things).
Provide a structured assessment indicating whether the candidate is potentially exaggerating or hiding something, along with their general confidence and stress levels.

Respond strictly in Professional Indonesian as a JSON object:
{
    "confidenceLevel": "Tinggi/Sedang/Rendah",
    "stressLevel": "Tinggi/Sedang/Rendah",
    "exaggerationRisk": "Tinggi/Sedang/Rendah",
    "analysis": "Penjelasan detail mengapa Anda menyimpulkan demikian berdasarkan bahasa dan gestur.",
    "recommendation": "Rekomendasi untuk interviewer (misal: 'Gali lebih dalam mengenai pengalaman di proyek X')"
}`;

        const promptContent = `
TRANSCRIPTION:
${transcription || "No transcription provided."}

EMOTION LOG SUMMARY:
${JSON.stringify(emotionLog || [])}
`;

        const msg = await anthropic.messages.create({
            model: aiConfig.model,
            max_tokens: aiConfig.max_tokens,
            temperature: 0.3, // Lower temperature for more analytical response
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: promptContent,
                },
            ],
        });

        const content = msg.content[0];
        let reportText = "";
        if (content.type === 'text') {
            const text = content.text;
            reportText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }

        // Save session
        let session = null;
        try {
            session = await prisma.interviewSession.create({
                data: {
                    candidateId,
                    transcription,
                    emotionLog,
                    aiAnalysisReport: reportText,
                    status: "analyzed",
                    endTime: new Date(),
                }
            });
        } catch (dbError) {
            console.error("Database save error (candidate might not exist):", dbError);
            // We still return the report to the UI even if we can't save it to the DB
            // so the user can see the analysis during testing.
            session = {
                candidateId,
                transcription,
                emotionLog,
                aiAnalysisReport: reportText,
                status: "analyzed",
                endTime: new Date(),
            };
        }

        return NextResponse.json({ success: true, session });
    } catch (error) {
        console.error("Interview analyze error:", error);
        return NextResponse.json(
            { error: "Failed to analyze interview", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
