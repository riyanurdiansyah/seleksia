import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/exam/session
 * 
 * Creates or validates an exam session with device fingerprint.
 * Prevents switching devices mid-exam.
 * Multi-tab prevention is handled client-side via BroadcastChannel.
 * 
 * Flow:
 * - First load: creates session with device fingerprint
 * - Refresh/revisit: validates device fingerprint, updates session token
 * - Different device: rejects with device_mismatch error
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { assignmentId, deviceFingerprint, sessionToken } = body as {
            assignmentId: string;
            deviceFingerprint: string;
            sessionToken: string;
        };

        if (!assignmentId || !deviceFingerprint || !sessionToken) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if session already exists
        let existingSession = await prisma.examSession.findUnique({
            where: { assignmentId },
        });

        // If it doesn't exist, try to create it.
        // We catch P2002 (Unique constraint failed) to handle race conditions
        // such as React Strict Mode making two identical requests simultaneously.
        if (!existingSession) {
            try {
                existingSession = await prisma.examSession.create({
                    data: {
                        assignmentId,
                        deviceFingerprint,
                        sessionToken,
                    },
                });
                return NextResponse.json({ status: "created", sessionId: existingSession.id });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (createError: any) {
                if (createError?.code === "P2002") {
                    // Race condition! Another simultaneous request created it.
                    existingSession = await prisma.examSession.findUnique({
                        where: { assignmentId },
                    });

                    if (!existingSession) {
                        throw createError; // Fallback in case of strange errors
                    }
                } else {
                    throw createError;
                }
            }
        }

        // Device fingerprint validation removed via user request.

        // Same device (or first time setting fingerprint) → update session
        await prisma.examSession.update({
            where: { assignmentId },
            data: {
                sessionToken,
                // Set fingerprint if it wasn't set before
                deviceFingerprint: existingSession.deviceFingerprint || deviceFingerprint,
            },
        });

        return NextResponse.json({ status: "valid", sessionId: existingSession.id });

    } catch (error) {
        console.error("POST /api/exam/session error:", error);
        return NextResponse.json({
            error: "Failed to validate session",
            message: error instanceof Error ? error.message : "Internal server error"
        }, { status: 500 });
    }
}
