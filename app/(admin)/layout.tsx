import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";
import AdminGuard from "./AdminGuard";

export const metadata = {
    title: "Admin Dashboard - SELEKSIA",
    description: "SELEKSIA admin panel for managing CBT exams and monitoring.",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
