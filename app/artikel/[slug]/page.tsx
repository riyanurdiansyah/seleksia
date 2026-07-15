import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Props {
    params: { slug: string };
}

export const dynamic = 'force-dynamic';

// Generate dynamic metadata for SEO
export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;
    const article = await prisma.article.findUnique({
        where: { slug },
    });

    if (!article) {
        return {
            title: "Artikel Tidak Ditemukan",
        };
    }

    return {
        title: article.seoTitle || `${article.title} - Seleksia`,
        description: article.seoDescription || article.excerpt || "Baca artikel ini di Seleksia.",
        keywords: article.seoKeywords || "seleksia, psikotes, rekrutmen",
        openGraph: {
            title: article.seoTitle || article.title,
            description: article.seoDescription || article.excerpt || undefined,
            images: article.coverImage ? [article.coverImage] : [],
        },
    };
}

export default async function ArticleDetailPage({ params }: Props) {
    const { slug } = await params;
    const article = await prisma.article.findUnique({
        where: { slug },
    });

    if (!article || article.status !== "published") {
        notFound();
    }

    return (
        <main className="min-h-screen bg-slate-50 pt-24 pb-20">
            <article className="container mx-auto px-4 max-w-4xl">
                {/* Back Button */}
                <Link 
                    href="/artikel" 
                    className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-teal-600 transition-colors mb-8"
                >
                    <span className="material-symbols-outlined text-[18px] mr-2">arrow_back</span>
                    Kembali ke Daftar Artikel
                </Link>

                {/* Article Header */}
                <header className="mb-12 text-center animate-fade-in">
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-teal-600 mb-4 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        {new Date(article.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        
                        {article.author && (
                            <>
                                <span className="mx-2 text-slate-300">•</span>
                                <span className="material-symbols-outlined text-[16px]">person</span>
                                {article.author}
                            </>
                        )}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                        {article.title}
                    </h1>
                </header>

                {/* Hero Image */}
                {article.coverImage && (
                    <div className="w-full aspect-video rounded-3xl overflow-hidden mb-12 shadow-xl animate-scale-up">
                        <img 
                            src={article.coverImage} 
                            alt={article.title} 
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Content */}
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 prose prose-slate prose-lg md:prose-xl max-w-none prose-headings:text-slate-900 prose-a:text-teal-600 hover:prose-a:text-teal-700 prose-img:rounded-xl">
                    <ReactMarkdown>{article.content}</ReactMarkdown>
                </div>
            </article>
        </main>
    );
}
