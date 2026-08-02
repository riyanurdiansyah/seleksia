import EmailClient from "./EmailClient";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getCompanyId } from "@/lib/tenant";

export const dynamic = 'force-dynamic';

function formatWaktuPelaksanaan(start: Date | null | undefined, end: Date | null | undefined): string {
    if (!start || !end) return "Belum ditentukan";
    
    const idLocale = "id-ID";
    const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    
    const formatTime = (d: Date) => d.toLocaleTimeString(idLocale, timeOptions).replace('.', ':');
    const formatDate = (d: Date) => d.toLocaleDateString(idLocale, dateOptions);

    const isSameDay = 
        start.getDate() === end.getDate() &&
        start.getMonth() === end.getMonth() &&
        start.getFullYear() === end.getFullYear();

    if (isSameDay) {
        return `${formatDate(start)} ${formatTime(start)} - ${formatTime(end)}`;
    } else {
        return `${formatDate(start)} ${formatTime(start)} - ${formatDate(end)} ${formatTime(end)}`;
    }
}

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

    const formattedData = candidates.map(c => {
        const firstAssignment = c.assignments[0];
        const waktuPelaksanaan = firstAssignment ? formatWaktuPelaksanaan(firstAssignment.accessStart, firstAssignment.accessEnd) : "Belum ditentukan";

        return {
            id: c.id,
            name: c.name,
            displayId: c.displayId,
            phone: c.phone || "",
            email: c.email,
            assignedTests: c.assignments.map(a => a.test.name).join(", ") || "No Tests",
            status: c.email ? "Ready" : "No Email",
            waktuPelaksanaan
        };
    });

    return <EmailClient initialData={formattedData} />;
}
