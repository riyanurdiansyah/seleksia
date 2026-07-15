import Anthropic from '@anthropic-ai/sdk';
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

async function getAIConfig(defaultTokens: number, defaultTemp: number) {
  try {
    const settings = await prisma.platformSetting.findMany({
      where: {
        key: { in: ['ANTHROPIC_MODEL', 'ANTHROPIC_MAX_TOKENS', 'ANTHROPIC_TEMPERATURE'] }
      }
    });
    
    const model = settings.find(s => s.key === 'ANTHROPIC_MODEL')?.value || process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
    const tokensStr = settings.find(s => s.key === 'ANTHROPIC_MAX_TOKENS')?.value;
    const max_tokens = tokensStr ? parseInt(tokensStr) : defaultTokens;
    const tempStr = settings.find(s => s.key === 'ANTHROPIC_TEMPERATURE')?.value;
    const temperature = tempStr ? parseFloat(tempStr) : defaultTemp;

    return { model, max_tokens, temperature };
  } catch (error) {
    return {
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: defaultTokens,
      temperature: defaultTemp,
    };
  }
}

export async function generateQuestions(
  topic: string,
  type: 'multiple_choice' | 'essay' | 'true_false' | 'number_series' | 'multiple_choice_weighted',
  count: number,
  difficulty: string
) {
  try {
    let systemPrompt = `You are an expert test question generator. 
Your task is to generate ${count} questions of type "${type}" about the topic: "${topic}".
The difficulty level should be "${difficulty}".

You MUST output your response as a pure JSON array containing the generated questions.
DO NOT wrap the response in markdown blocks like \`\`\`json. Just output the raw JSON array.

`;

    if (type === 'multiple_choice') {
      systemPrompt += `Each object in the array MUST have this exact structure:
{
  "text": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
  "correctAnswer": "The exact text of the correct option"
}`;
    } else if (type === 'essay') {
      systemPrompt += `Each object in the array MUST have this exact structure:
{
  "text": "The essay prompt/question text",
  "aiRubric": "A detailed rubric outlining what a perfect answer should contain, key points to look for, and how to grade it."
}`;
    } else if (type === 'true_false') {
      systemPrompt += `Each object in the array MUST have this exact structure:
{
  "text": "The true/false statement",
  "options": ["True", "False"],
  "correctAnswer": "True" // or "False"
}`;
    } else if (type === 'number_series') {
      systemPrompt += `Each object in the array MUST have this exact structure:
{
  "text": "The number series with a missing number (e.g. '2, 4, 6, ?, 10')",
  "options": ["7", "8", "9", "12", "14"],
  "correctAnswer": "8"
}`;
    } else if (type === 'multiple_choice_weighted') {
      systemPrompt += `Each object in the array MUST have this exact structure:
{
  "text": "The question text representing a scenario or behavioral preference",
  "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
  "optionWeights": { "A": 5, "B": 4, "C": 3, "D": 2, "E": 1 }
}
Note: optionWeights keys MUST be the letters "A", "B", "C", "D", "E" corresponding to the order of the options.`;
    }

    const aiConfig = await getAIConfig(4096, 0.7);
    const msg = await anthropic.messages.create({
      model: aiConfig.model,
      max_tokens: aiConfig.max_tokens,
      temperature: aiConfig.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate the questions now as a JSON array.',
        },
      ],
    });

    const content = msg.content[0];
    if (content.type === 'text') {
        const text = content.text;
        // Basic cleanup in case Claude added markdown wrappers despite the prompt
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanText);
    }
    
    throw new Error("Unexpected response format from Claude");
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

export async function gradeEssay(
  questionText: string,
  candidateAnswer: string,
  rubric: string | null
) {
  try {
    const systemPrompt = `You are an expert, objective examiner. 
Your task is to evaluate a candidate's answer to an essay question based on the provided rubric.

Question:
${questionText}

Rubric/Grading Guidelines:
${rubric || "Evaluate based on clarity, completeness, accuracy, and depth of understanding. Give a score from 0 to 100."}

Candidate's Answer:
${candidateAnswer}

You MUST evaluate the answer and return your evaluation strictly as a JSON object with this exact structure:
{
  "score": 85, // A number between 0 and 100
  "feedback": "Detailed explanation of why the score was given, what was good, and what was missing."
}
DO NOT wrap the response in markdown blocks like \`\`\`json. Just output the raw JSON object.
`;

    const aiConfig = await getAIConfig(1024, 0.3);
    const msg = await anthropic.messages.create({
      model: aiConfig.model,
      max_tokens: aiConfig.max_tokens,
      temperature: aiConfig.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Grade the essay now as a JSON object.',
        },
      ],
    });

    const content = msg.content[0];
    if (content.type === 'text') {
        const text = content.text;
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanText);
    }
    
    throw new Error("Unexpected response format from Claude");
  } catch (error) {
    console.error('Error grading essay:', error);
    throw error;
  }
}

export async function generatePersonalityInsight(
  candidateName: string,
  essayAnswers: { question: string; answer: string }[]
) {
  try {
    const dataStr = essayAnswers.map((item, index) => 
        `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`).join('\n\n');

    const systemPrompt = `You are an expert corporate psychologist. 
Your task is to analyze a candidate's written responses and generate a brief "Personality Insight" report.
The report should analyze their communication style, potential strengths, problem-solving approach, and working style based solely on the text provided.

Candidate Name: ${candidateName}

Candidate's Written Responses:
${dataStr}

Write the report in Professional Indonesian language. Use markdown formatting for readability. 
Keep it concise, objective, and constructive. Around 2-3 paragraphs.
`;

    const aiConfig = await getAIConfig(1024, 0.5);
    const msg = await anthropic.messages.create({
      model: aiConfig.model,
      max_tokens: aiConfig.max_tokens,
      temperature: aiConfig.temperature,
      system: "You are an expert corporate psychologist.",
      messages: [
        {
          role: 'user',
          content: systemPrompt,
        },
      ],
    });

    const content = msg.content[0];
    if (content.type === 'text') {
        return content.text;
    }
    
    throw new Error("Unexpected response format from Claude");
  } catch (error) {
    console.error('Error generating personality insight:', error);
    throw error;
  }
}

export async function generateArticle(
  topic: string,
  keywords: string,
  tone: string = "Professional yet engaging"
) {
  try {
    const systemPrompt = `You are an expert SEO content writer and blogger.
Your task is to write a high-quality, engaging, and SEO-optimized article in Indonesian language about the following topic.

Topic: "${topic}"
SEO Keywords to include naturally: "${keywords}"
Tone of voice: "${tone}"

You MUST output your response strictly using the following XML tags format:
<title>A catchy, SEO-friendly title (H1)</title>
<slug>url-friendly-slug-based-on-title</slug>
<excerpt>A short, engaging summary (1-2 sentences) for meta description and previews.</excerpt>
<seoTitle>SEO optimized meta title (max 60 chars)</seoTitle>
<seoDescription>SEO optimized meta description (max 160 chars)</seoDescription>
<seoKeywords>comma, separated, keywords</seoKeywords>
<content>
The full article content formatted in Markdown. Include appropriate headings (H2, H3), bullet points, and paragraphs.
</content>`;

    const aiConfig = await getAIConfig(2000, 0.7);
    const msg = await anthropic.messages.create({
      model: aiConfig.model,
      max_tokens: 4096, // Override DB settings for articles since they are inherently long
      temperature: aiConfig.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate the SEO article now using the specified XML tags format. Do NOT include any conversational filler. Start directly with the <title> tag.',
        },
        {
          role: 'assistant',
          content: '<title>'
        }
      ],
    });

    const contentMsg = msg.content[0];
    if (contentMsg.type === 'text') {
        // Re-add the prefilled <title> tag to the start of the response
        const text = '<title>' + contentMsg.text;
        
        // Helper to extract content between XML tags safely (handles cutoff gracefully)
        const extractTag = (tag: string) => {
            const regex = new RegExp(`<${tag}>([\\s\\S]*?)(?:</${tag}>|$)`, 'i');
            const match = text.match(regex);
            return match ? match[1].trim() : '';
        };

        const result = {
            title: extractTag('title'),
            slug: extractTag('slug'),
            excerpt: extractTag('excerpt'),
            seoTitle: extractTag('seoTitle'),
            seoDescription: extractTag('seoDescription'),
            seoKeywords: extractTag('seoKeywords'),
            content: extractTag('content'),
        };
        
        // If it somehow fails to parse the tags, fallback to simple parsing or throw an error
        if (!result.title || !result.content) {
            console.error("FULL CLAUDE TEXT:", text);
            throw new Error("Failed to parse tags from Claude's response. See console for full text.");
        }
        
        return result;
    }
    
    throw new Error("Unexpected response format from Claude");
  } catch (error) {
    console.error('Error generating article:', error);
    throw error;
  }
}

