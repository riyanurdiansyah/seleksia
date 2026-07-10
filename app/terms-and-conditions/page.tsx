import { prisma } from "@/lib/prisma";
import PublicPageWrapper from "../components/PublicPageWrapper";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Syarat & Ketentuan | Seleksia",
    description: "Syarat dan Ketentuan Layanan",
};

export default async function TermsAndConditionsPage() {
    let setting = null;
    try {
        setting = await prisma.platformSetting.findUnique({
            where: { key: "page_terms_and_conditions" }
        });
    } catch (e) {
        console.error(e);
    }
    
    const content = setting?.value || "<p>Belum ada konten Syarat & Ketentuan.</p>";

    return <PublicPageWrapper title="Syarat & Ketentuan" content={content} />;
}
