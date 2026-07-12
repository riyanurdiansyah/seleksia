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
    const temperature = tempStr ? parseFloat(tempStr) : 0.7;

    return { model, max_tokens, temperature };
  } catch (error) {
    return {
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 2048,
      temperature: 0.7,
    };
  }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidateId, message } = body;

        if (!candidateId) {
            return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
        }

        // Fetch session
        const session = await prisma.interviewSession.findFirst({
            where: { candidateId },
            orderBy: { createdAt: 'desc' }
        });

        if (!session) {
            return NextResponse.json({ error: "Interview session not found. Please setup first." }, { status: 404 });
        }

        const chatHistory: any[] = Array.isArray(session.chatHistory) ? session.chatHistory : [];
        
        // Count how many questions AI has asked
        const aiMessagesCount = chatHistory.filter(msg => msg.role === 'assistant').length;

        if (message) {
            chatHistory.push({ role: 'user', content: message });
        }

        const isEnding = aiMessagesCount >= session.maxQuestions;

        const aiConfig = await getAIConfig();
        const langStr = session.language === 'id' ? 'Indonesian' : 'English';

        let systemPrompt = `You are "Bu Sarah", a warm, humble, and highly engaging Talent Acquisition professional conducting a video interview.
Your task is to interview a candidate for the position of "${session.position || 'Posisi Umum'}" based on this context/CV:
"""
${session.context}
"""

Guidelines:
1. Persona & Language: You are very friendly, empathetic, and professional. You MUST speak in highly fluent, natural, and conversational Indonesian (Bahasa Indonesia yang sangat fasih, luwes, dan tidak kaku). Do not use stiff or formal translation-like phrases. Use natural Indonesian conversational fillers smoothly if needed.
2. Opening: If this is the VERY FIRST message (the start of the interview), you MUST greet the candidate warmly, introduce yourself as Sarah from HR, and ask how they are doing today BEFORE jumping into any serious questions.
3. 2-Way Communication: Keep your responses conversational (1-3 short sentences max). You are speaking aloud, so do NOT use bullet points, markdown, or complex formatting. Always allow the candidate to speak or ask questions.
4. Interruption Handling: If the candidate says something like "Wait", "Hold on", "Bentar", or interrupts you, STOP your current thought immediately, acknowledge their interruption (e.g., "Oh, iya silakan...", "Maaf, ada yang ingin ditambahkan?"), and let them speak.
5. Background Noise / Mute Reminder: If the candidate's transcribed text seems like random background noise, echo, or unintentional mumbling (especially right after your introduction), do not assume it's their answer. Politely remind them to click the Mute button on their screen if they are not speaking (e.g., "Sepertinya ada suara pantulan, boleh di-mute dulu mikrofonnya jika belum berbicara ya").
6. Flexibility: If the candidate asks you a question, answer it warmly in fluent Indonesian.
7. Progress: You have asked ${aiMessagesCount} questions (or taken turns) so far out of ${session.maxQuestions} allowed.
`;

        if (isEnding) {
            systemPrompt += `\n6. CRITICAL: You have reached the maximum number of questions. You MUST end the interview now. Thank the candidate and tell them the interview is over.`;
        }

        systemPrompt += `\n\nYou MUST respond strictly in a JSON object with this format:
{
    "speech": "The exact text you want to say to the candidate",
    "isFinished": boolean (true ONLY if you are ending the interview right now)
}`;

        // Convert our chatHistory to Anthropic format
        const anthropicMessages = chatHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        })) as Anthropic.MessageParam[];

        // If history is empty and there's no incoming message, we need to send a dummy "Start interview" trigger 
        // so the AI initiates the conversation.
        if (anthropicMessages.length === 0) {
            anthropicMessages.push({ role: 'user', content: `[SYSTEM]: The candidate has joined the room. Please start the interview in ${langStr}.` });
        } else if (anthropicMessages[anthropicMessages.length - 1].role === 'assistant') {
            // The last message was from the assistant, but we are asking it to speak again without user input
            anthropicMessages.push({ role: 'user', content: `[SYSTEM]: The candidate is listening, please continue or ask your next question.` });
        }

        const msg = await anthropic.messages.create({
            model: aiConfig.model,
            max_tokens: aiConfig.max_tokens,
            temperature: 0.7,
            system: systemPrompt,
            messages: anthropicMessages,
        });

        const content = msg.content[0];
        let aiResponse = { speech: "Maaf, terjadi kesalahan.", isFinished: false };
        
        if (content.type === 'text') {
            try {
                const text = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                aiResponse = JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse AI JSON:", content.text);
                aiResponse.speech = content.text;
            }
        }

        // Add AI's response to history
        chatHistory.push({ role: 'assistant', content: aiResponse.speech });

        // Save back to DB
        await prisma.interviewSession.update({
            where: { id: session.id },
            data: { chatHistory, status: aiResponse.isFinished ? "completed" : session.status }
        });

        return NextResponse.json({ 
            success: true, 
            speech: aiResponse.speech, 
            isFinished: aiResponse.isFinished 
        });

    } catch (error) {
        console.error("Interview chat error:", error);
        return NextResponse.json(
            { error: "Failed to process chat", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
