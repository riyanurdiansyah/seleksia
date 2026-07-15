import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Artikel & Berita Terbaru - Seleksia",
    description: "Baca artikel, tips, dan wawasan terbaru seputar dunia rekrutmen, HR, dan psikologi dari Seleksia.",
};

// Remove revalidate to use dynamic rendering for now, or keep it if static is preferred
export const dynamic = 'force-dynamic';

export default async function ArtikelListPage() {
    const articles = await prisma.article.findMany({
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
    });

    return (
        <main className="min-h-screen bg-slate-50 pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                        Wawasan & <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-cyan-500">Inspirasi</span>
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Temukan artikel terbaru, tips rekrutmen, dan wawasan seputar psikologi industri dan organisasi untuk mengembangkan tim Anda.
                    </p>
                </div>

                {articles.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">article</span>
                        <h3 className="text-xl font-bold text-slate-800">Belum Ada Artikel</h3>
                        <p className="text-slate-500 mt-2">Nantikan artikel menarik dari kami segera.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {articles.map((article, index) => (
                            <Link 
                                href={`/artikel/${article.slug}`} 
                                key={article.id}
                                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col h-full animate-slide-up"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Thumbnail Placeholder if no coverImage */}
                                <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                                    {article.coverImage ? (
                                        <img 
                                            src={article.coverImage} 
                                            alt={article.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                            <span className="material-symbols-outlined text-5xl text-teal-600/50">newspaper</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-6 flex flex-col flex-grow">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 mb-3 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                        {new Date(article.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-teal-600 transition-colors">
                                        {article.title}
                                    </h2>
                                    <p className="text-slate-600 mb-6 line-clamp-3 text-sm flex-grow">
                                        {article.excerpt}
                                    </p>
                                    
                                    <div className="mt-auto flex items-center text-teal-600 font-semibold text-sm group-hover:gap-2 transition-all">
                                        Baca Selengkapnya
                                        <span className="material-symbols-outlined text-[18px] ml-1 group-hover:ml-2 transition-all">arrow_right_alt</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
