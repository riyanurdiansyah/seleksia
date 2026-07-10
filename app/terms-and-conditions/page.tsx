import { prisma } from "@/lib/prisma";
import PublicPageWrapper from "../components/PublicPageWrapper";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Syarat & Ketentuan | Psikoest",
    description: "Syarat dan Ketentuan Layanan",
};

export default async function TermsAndConditionsPage() {
    const setting = await prisma.platformSetting.findUnique({
        where: { key: "page_terms_and_conditions" }
    });
    
    const content = setting?.value || "<p>Belum ada konten Syarat & Ketentuan.</p>";

    return <PublicPageWrapper title="Syarat & Ketentuan" content={content} />;
}
