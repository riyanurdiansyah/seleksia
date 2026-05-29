import EmailClient from "./EmailClient";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getCompanyId } from "@/lib/tenant";

export const dynamic = 'force-dynamic';

export default async function EmailPage(props: { searchParams: Promise<{ companyId?: string }> }) {
    const searchParams = await props.searchParams;
    const cookieStore = await cookies();
    const role = cookieStore.get("userRole")?.value || "user";
    const companyIdFilter = searchParams.companyId;

    const whereClause: any = { role: 'user' };

    if (role === 'superadmin') {
        if (companyIdFilter && companyIdFilter !== 'all') {
            whereClause.companyId = companyIdFilter;
        }
    } else {
        const companyId = await getCompanyId();
        whereClause.companyId = companyId;
    }

    const candidates = await prisma.candidate.findMany({
        where: whereClause,
        include: {
            assignments: {
                where: { status: 'assigned' },
                include: { test: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const formattedData = candidates.map(c => ({
        id: c.id,
        name: c.name,
        displayId: c.displayId,
        phone: c.phone || "",
        email: c.email,
        assignedTests: c.assignments.map(a => a.test.name).join(", ") || "No Tests",
        status: c.email ? "Ready" : "No Email"
    }));

    return <EmailClient initialData={formattedData} />;
}
