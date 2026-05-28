import WhatsappClient from "./WhatsappClient";
import { prisma } from "@/lib/prisma";

export default async function WhatsappPage() {
    const candidates = await prisma.candidate.findMany({
        where: { role: 'user' },
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
        status: c.phone ? "Ready" : "No Phone Number"
    }));

    return <WhatsappClient initialData={formattedData} />;
}
