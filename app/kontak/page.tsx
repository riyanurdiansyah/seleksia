import { prisma } from "@/lib/prisma";
import PublicPageWrapper from "../components/PublicPageWrapper";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kontak | Seleksia",
    description: "Informasi Kontak Kami",
};

export default async function ContactPage() {
    let setting = null;
    try {
        setting = await prisma.platformSetting.findUnique({
            where: { key: "page_contact" }
        });
    } catch (e) {
        console.error(e);
    }
    
    const content = setting?.value || "<p>Belum ada informasi kontak.</p>";

    return <PublicPageWrapper title="Kontak" content={content} />;
}
