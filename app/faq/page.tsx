import { prisma } from "@/lib/prisma";
import PublicPageWrapper from "../components/PublicPageWrapper";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "FAQ | Psikoest",
    description: "Frequently Asked Questions",
};

export default async function FAQPage() {
    const setting = await prisma.platformSetting.findUnique({
        where: { key: "page_faq" }
    });
    
    const content = setting?.value || "<p>Belum ada konten FAQ.</p>";

    return <PublicPageWrapper title="FAQ" content={content} />;
}
