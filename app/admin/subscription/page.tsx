import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AdminSubscriptionFallbackPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === "string") {
            query.set(key, value);
        }
    });

    const queryString = query.toString();
    redirect(queryString ? `/subscription?${queryString}` : "/subscription");
}
