import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";
import AdminGuard from "./AdminGuard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const metadata = {
    title: "Admin Dashboard - SELEKSIA",
    description: "SELEKSIA admin panel for managing CBT exams and monitoring.",
    icons: {
        icon: "/full-logo-only.png",
    },
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const companyId = cookieStore.get("companyId")?.value;

    if (companyId) {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { subscriptionStatus: true }
        });

        if (company?.subscriptionStatus === "pending_payment") {
            redirect("/payment");
        }
    }

    return (
        <AdminGuard>
            <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg-base)]">
                <AdminSidebar />
                <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                    <AdminHeader />
                    <main className="flex-1 overflow-y-auto bg-[var(--color-bg-base)]">
                        <div className="relative p-7 max-w-[1600px] mx-auto space-y-6 pb-12">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </AdminGuard>
    );
}
