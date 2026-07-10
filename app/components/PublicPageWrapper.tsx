import React from "react";
import Link from "next/link";

export default function PublicPageWrapper({ title, content }: { title: string, content: string }) {
    return (
        <div className="min-h-screen font-sans bg-gray-50 flex flex-col selection:bg-primary selection:text-white overflow-x-hidden">
            {/* Navbar matching Landing Page */}
            <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/full-logo.png" alt="Psikoest Logo" className="h-8 object-contain" />
                    </Link>
                    
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                        <Link href="/#fitur" className="hover:text-primary transition-colors">Fitur</Link>
                        <Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link>
                        <Link href="/kontak" className="hover:text-primary transition-colors">Kontak</Link>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-primary transition-colors px-4 py-2">
                            Masuk
                        </Link>
                        <Link href="/register" className="text-sm font-semibold bg-gradient-to-r from-primary to-accent text-white px-5 py-2.5 rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
                            Mulai Gratis
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 pt-16 flex flex-col">
                {/* Hero Title Section */}
                <section className="relative w-full bg-gradient-to-br from-[#1A3C40] via-[#0c5c64] to-[#059669] py-16 md:py-24">
                    {/* Subtle Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
                    <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{title}</h1>
                    </div>
                </section>

                {/* Content Section */}
                <section className="flex-1 -mt-8 relative z-20 pb-24">
                    <div className="max-w-4xl w-full mx-auto px-6">
                        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 md:p-12">
                            <div 
                                className="prose prose-emerald max-w-none text-[var(--color-text-sub)]
                                           prose-headings:font-bold prose-headings:text-[var(--color-text-main)]
                                           prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                                           prose-p:leading-relaxed prose-p:mb-4
                                           prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4
                                           prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4
                                           prose-li:mb-2
                                           prose-strong:font-semibold prose-strong:text-[var(--color-text-main)]
                                           prose-a:text-primary prose-a:underline hover:prose-a:text-primary-hover"
                                dangerouslySetInnerHTML={{ __html: content }} 
                            />
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer matching Landing Page */}
            <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <img src="/full-logo.png" alt="Psikoest" className="h-8 mb-6 brightness-0 invert" style={{ filter: 'brightness(0) invert(1)' }} />
                        <p className="text-sm max-w-md leading-relaxed">
                            Platform SaaS terdepan untuk Computer Based Test (CBT) dan asesmen psikologi, memberdayakan perusahaan dan institusi di seluruh Indonesia.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Perusahaan</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/faq" className="hover:text-white transition-colors">Tentang Kami</Link></li>
                            <li><Link href="/kontak" className="hover:text-white transition-colors">Kontak</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/terms-and-conditions" className="hover:text-white transition-colors">Syarat & Ketentuan</Link></li>
                            <li><Link href="/refund-policy" className="hover:text-white transition-colors">Kebijakan Refund</Link></li>
                            <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-gray-800 text-sm text-center md:text-left flex flex-col md:flex-row justify-between items-center">
                    <p>&copy; {new Date().getFullYear()} Psikoest by PT Contoh Solusi Digital. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
