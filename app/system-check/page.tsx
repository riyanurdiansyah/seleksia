import Header from "../components/Header";
import Stepper from "../components/Stepper";
import FooterLinks from "../components/FooterLinks";
import SystemCheckClient from "./SystemCheckClient";
import AuthGuard from "../components/AuthGuard";

export const metadata = {
    title: "System Check - SELEKSIA",
};

export default function SystemCheckPage() {
    return (
        <AuthGuard allowedRoles={["user"]}>
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {/* Stepper */}
                        <Stepper currentStep={0} />

                        {/* Page Header */}
                        <div className="text-center mt-10 animate-fade-in">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                System Readiness Check
                            </h1>
                            <p className="mt-2 text-slate-600 dark:text-slate-400">
                                We need to verify your equipment before starting the exam to
                                ensure a smooth experience.
                            </p>
                        </div>

                        {/* Client-side interactive content */}
                        <SystemCheckClient />

                        <FooterLinks />
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
