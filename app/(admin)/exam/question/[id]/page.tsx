export default async function TestDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Dynamic import to avoid SSR issues with client component
    const { default: TestDetailClient } = await import("./TestDetailClient");

    return <TestDetailClient testId={id} />;
}
