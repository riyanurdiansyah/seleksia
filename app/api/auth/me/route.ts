import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCompanyId } from "@/lib/tenant";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const role = cookieStore.get("userRole")?.value || "user";
        const companyId = await getCompanyId();

        return NextResponse.json({
            role,
            companyId,
        });
    } catch (error) {
        console.error("GET /api/auth/me error:", error);
        return NextResponse.json(
            { error: "Failed to get session details" },
            { status: 500 }
        );
    }
}
