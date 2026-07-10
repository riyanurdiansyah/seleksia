import { prisma } from "@/lib/prisma";
import PublicPageWrapper from "../components/PublicPageWrapper";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kontak | Psikoest",
    description: "Informasi Kontak Kami",
};

export default async function ContactPage() {
    const setting = await prisma.platformSetting.findUnique({
        where: { key: "page_contact" }
    });
    
    const content = setting?.value || "<p>Belum ada informasi kontak.</p>";

    return <PublicPageWrapper title="Kontak" content={content} />;
}
