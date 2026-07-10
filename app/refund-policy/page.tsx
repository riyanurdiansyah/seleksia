import { prisma } from "@/lib/prisma";
import PublicPageWrapper from "../components/PublicPageWrapper";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Refund Policy | Psikoest",
    description: "Kebijakan Pengembalian Dana",
};

export default async function RefundPolicyPage() {
    const setting = await prisma.platformSetting.findUnique({
        where: { key: "page_refund_policy" }
    });
    
    const content = setting?.value || "<p>Belum ada konten Refund Policy.</p>";

    return <PublicPageWrapper title="Refund Policy" content={content} />;
}
