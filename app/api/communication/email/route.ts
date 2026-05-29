import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { candidateId, subject, message } = body;

        if (!candidateId || !subject || !message) {
            return NextResponse.json({ error: "Candidate ID, subject, and message are required" }, { status: 400 });
        }

        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: { company: true }
        });

        if (!candidate) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }

        // Simulate sending email (600ms delay)
        await new Promise(r => setTimeout(r, 600));

        console.log(`[EMAIL SENT] To: ${candidate.email}, Subject: ${subject}, Message: ${message}`);

        return NextResponse.json({
            success: true,
            recipient: candidate.email,
            message: `Email successfully sent to ${candidate.name} (${candidate.email})`
        });
    } catch (error) {
        console.error("POST /api/communication/email error:", error);
        return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }
}
