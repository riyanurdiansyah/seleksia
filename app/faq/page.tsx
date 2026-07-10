import { prisma } from "@/lib/prisma";
import PublicPageWrapper from "../components/PublicPageWrapper";
import FaqAccordion from "../components/FaqAccordion";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "FAQ | Seleksia",
    description: "Frequently Asked Questions",
};

export default async function FAQPage() {
    let setting = null;
    try {
        setting = await prisma.platformSetting.findUnique({
            where: { key: "page_faq" }
        });
    } catch (error) {
        console.error("Database connection error:", error);
    }
    
    let faqData = null;
    if (setting?.value) {
        try { faqData = JSON.parse(setting.value); } catch(e) {}
    }

    return (
        <PublicPageWrapper title="FAQ">
            {faqData && Array.isArray(faqData) ? (
                <FaqAccordion items={faqData} />
            ) : (
                <div className="prose prose-emerald max-w-none text-center">
                    <p>Belum ada data FAQ.</p>
                </div>
            )}
        </PublicPageWrapper>
    );
}
