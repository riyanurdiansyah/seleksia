import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Determine content-type to parse correctly. pusher-js can send JSON or form-urlencoded.
    const contentType = req.headers.get("content-type") || "";
    let socketId = "";
    let channelName = "";
    let candidateId = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      socketId = body.socketId || body.socket_id;
      channelName = body.channelName || body.channel_name;
      candidateId = body.candidateId;
    } else {
      // urlencoded parser helper
      const text = await req.text();
      const params = new URLSearchParams(text);
      socketId = params.get("socket_id") || "";
      channelName = params.get("channel_name") || "";
      candidateId = params.get("candidateId") || "";
    }

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    let presenceData: any = null;

    if (channelName.startsWith("presence-")) {
      // Find candidate from candidateId or check database
      if (!candidateId) {
        return NextResponse.json({ error: "candidateId is required for presence channels" }, { status: 400 });
      }

      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }

      presenceData = {
        user_id: candidate.id,
        user_info: {
          id: candidate.id,
          name: candidate.name,
          displayId: candidate.displayId,
          role: candidate.role,
          companyId: candidate.companyId,
        },
      };
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
