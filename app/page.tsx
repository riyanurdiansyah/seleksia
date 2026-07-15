import React from 'react';
import Link from 'next/link';
import FaqAccordion from './components/FaqAccordion';
import { prisma } from "@/lib/prisma";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seleksia - Platform Asesmen Psikologi #1',
  description: 'Satu platform terpadu untuk evaluasi psikotes, ujian online CBT, dan pengawasan otomatis anti-kecurangan.',
};

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const [faqSetting, contactSetting, subscriptionPlans, questionTypesSetting] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { key: "page_faq" } }),
    prisma.platformSetting.findUnique({ where: { key: "page_contact" } }),
    prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.platformSetting.findUnique({ where: { key: "page_question_types" } })
  ]);
  const faqContent = faqSetting?.value || "<p>Belum ada konten FAQ.</p>";
  
  let faqData = null;
  try {
    const parsed = JSON.parse(faqContent);
    if (Array.isArray(parsed)) faqData = parsed;
  } catch (e) {
    // If parsing fails, it's probably the old HTML string
  }

  const contactContent = contactSetting?.value || "<p>Belum ada informasi kontak.</p>";
  
  let questionTypesData = null;
  if (questionTypesSetting?.value) {
    try { questionTypesData = JSON.parse(questionTypesSetting.value); } 
    catch (e) { console.error("Failed to parse question types"); }
  }

  const waLink = "https://wa.me/6285111410005?text=Halo,%20saya%20mau%20tanya%20seputar%20Seleksia";

  return (
    <div className="min-h-screen font-sans bg-gray-50 flex flex-col selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/full-logo.png" alt="Seleksia Logo" className="h-8 object-contain" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="#fitur" className="hover:text-primary transition-colors">Fitur</Link>
            <Link href="#jenis-soal" className="hover:text-primary transition-colors">Asesmen</Link>
            <Link href="#harga" className="hover:text-primary transition-colors">Harga</Link>
            <Link href="#faq" className="hover:text-primary transition-colors">FAQ</Link>
            <Link href="#kontak" className="hover:text-primary transition-colors">Kontak</Link>
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

      <main className="flex-1 pt-16">
        {/* Hero Section (BarengWarga Inspired Split Gradient/Glassmorphism) */}
        <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#1A3C40] via-[#0c5c64] to-[#059669] py-24 md:py-32 lg:py-40">
          {/* Subtle Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          
          {/* Blur Orbs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-10 rounded-full blur-[120px] mix-blend-screen pointer-events-none -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#007B83] opacity-20 rounded-full blur-[140px] pointer-events-none translate-y-1/3 -translate-x-1/4" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 px-4 py-2 rounded-full text-xs font-bold border border-white/20 backdrop-blur-md">
                <span className="material-symbols-outlined text-sm text-green-300">verified</span>
                <span>Platform Asesmen #1 di Indonesia</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
                Satu Platform,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-200 to-white">
                  Seluruh Evaluasi
                </span> Terhubung.
              </h1>
              
              <p className="text-lg md:text-xl text-white/80 leading-relaxed font-light">
                Kelola administrasi kandidat, ujian CBT *real-time*, pengawasan cerdas berbasis webcam, dan penerbitan laporan instan dalam satu atap yang aman dan mudah.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link href="/register" className="w-full sm:w-auto bg-white text-primary font-bold px-8 py-4 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:-translate-y-1 transition-all text-center">
                  Coba Gratis Sekarang
                </Link>
                <Link href={waLink} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto bg-white/10 text-white font-semibold px-8 py-4 rounded-full border border-white/20 hover:bg-white/20 transition-all backdrop-blur-sm text-center">
                  Hubungi Sales
                </Link>
              </div>
            </div>

            {/* Dashboard Mockup / Glass Card */}
            <div className="hidden lg:block relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-white/20 rounded-2xl transform rotate-3 scale-105 backdrop-blur-3xl border border-white/10 shadow-2xl"></div>
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white">
                 <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                 </div>
                 <div className="space-y-4">
                    <div className="h-8 bg-white/20 rounded w-1/3"></div>
                    <div className="h-32 bg-white/10 rounded w-full border border-white/5"></div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-24 bg-white/10 rounded border border-white/5"></div>
                        <div className="h-24 bg-white/10 rounded border border-white/5"></div>
                        <div className="h-24 bg-white/10 rounded border border-white/5"></div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-white py-12 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-100">
                    <div className="space-y-2">
                        <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900">10k+</h3>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Kandidat Aktif</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900">500+</h3>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Perusahaan</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900">99.9%</h3>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Uptime Server</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900">24/7</h3>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Support Tim</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="fitur" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">Keunggulan Kami</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Mengapa Memilih Seleksia?</h3>
              <p className="text-lg text-gray-600">
                Kami merancang sistem yang berfokus pada kecepatan, keamanan, dan pengalaman pengguna yang luar biasa, baik untuk admin maupun kandidat.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">computer</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Ujian CBT Real-Time</h4>
                <p className="text-gray-600 leading-relaxed">
                  Sistem Computer Based Test yang stabil dengan auto-save jawaban dan proteksi koneksi terputus.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">policy</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Anti Kecurangan</h4>
                <p className="text-gray-600 leading-relaxed">
                  Pemantauan via webcam berkala secara otomatis, log perpindahan tab, dan fitur fullscreen wajib.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">analytics</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Laporan Otomatis</h4>
                <p className="text-gray-600 leading-relaxed">
                  Kalkulasi skor langsung saat ujian selesai, mendukung berbagai tipe soal psikologi termasuk skala Likert.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Question Types Section */}
        {questionTypesData && (
          <section id="jenis-soal" className="py-24 bg-gradient-to-br from-gray-50 to-white relative border-b border-gray-100 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">Tipe Asesmen</h2>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{questionTypesData.title}</h3>
                <p className="text-lg text-gray-600">
                  {questionTypesData.subtitle}
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                {questionTypesData.items.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Test Banner */}
              {questionTypesData.customTest && (
                <div className="bg-gradient-to-r from-primary to-[#059669] rounded-3xl p-8 md:p-10 shadow-xl w-full text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                  <div className="relative z-10 flex-1 text-center md:text-left">
                    <h4 className="text-2xl font-bold mb-3">{questionTypesData.customTest.title}</h4>
                    <p className="text-white/80 leading-relaxed max-w-2xl mx-auto md:mx-0">{questionTypesData.customTest.desc}</p>
                  </div>
                  <div className="relative z-10 shrink-0">
                    <Link href={questionTypesData.customTest.buttonLink === '#kontak' ? waLink : questionTypesData.customTest.buttonLink} 
                          target={questionTypesData.customTest.buttonLink === '#kontak' ? "_blank" : undefined}
                          rel={questionTypesData.customTest.buttonLink === '#kontak' ? "noopener noreferrer" : undefined}
                          className="inline-flex items-center gap-2 bg-white text-primary font-bold px-6 py-4 rounded-xl hover:bg-gray-50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all whitespace-nowrap">
                      {questionTypesData.customTest.buttonText}
                      <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Pricing Section */}
        <section id="harga" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">Paket Harga</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Pilih Paket Sesuai Kebutuhan Anda</h3>
              <p className="text-lg text-gray-600">
                Transparan, tanpa biaya tersembunyi. Skalakan rekrutmen Anda dengan harga yang masuk akal.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
              {subscriptionPlans.length > 0 ? subscriptionPlans.map((plan, index) => {
                const isPopular = plan.isPopular;
                const isCustom = plan.priceText?.toLowerCase().includes('kustom') || plan.priceText?.toLowerCase().includes('custom');
                
                // Color variations based on plan position or type
                let priceColor = "text-emerald-400";
                if (isPopular) priceColor = "text-primary";
                if (isCustom) priceColor = "text-sky-500";

                return (
                  <div key={plan.id} className={`rounded-3xl p-8 flex flex-col h-full relative transition-all duration-300 ${
                    isPopular 
                      ? "bg-white border-2 border-primary shadow-xl transform md:-translate-y-2 z-10" 
                      : "bg-white border border-gray-100 shadow-sm hover:shadow-lg"
                  }`}>
                    
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-indigo-400 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-md whitespace-nowrap">
                        <span className="material-symbols-outlined text-[14px]">star</span> Paling Populer
                      </div>
                    )}
                    
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                    <p className="text-sm text-gray-400 mb-8 leading-relaxed h-10 shrink-0">
                      {plan.maxCandidates === -1 || plan.maxCandidates === 0 ? 'Kapasitas kandidat sesuai kebutuhan.' : `Maks. ${plan.maxCandidates} Kandidat.`}
                    </p>
                    
                    <div className="mb-8 flex items-baseline gap-1 shrink-0">
                      <span className={`text-4xl md:text-5xl font-extrabold ${priceColor}`}>
                        {plan.priceText || (plan.price === 0 ? "Rp 0" : `Rp ${plan.price.toLocaleString('id-ID')}`)}
                      </span>
                      {!isCustom && (
                        <span className="text-gray-400 text-sm font-medium"> / bulan</span>
                      )}
                    </div>
                    
                    <ul className="space-y-4 mb-10 flex-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-500 text-sm">
                          <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0">check_circle</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Link href={plan.price === 0 ? "/register" : (isCustom ? waLink : "/register")} 
                          target={isCustom ? "_blank" : undefined}
                          rel={isCustom ? "noopener noreferrer" : undefined}
                          className={`flex items-center justify-center gap-2 w-full text-center font-bold px-6 py-4 rounded-xl transition-all ${
                            isPopular 
                              ? "bg-primary text-white hover:brightness-110 shadow-lg hover:shadow-xl" 
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          }`}>
                      {plan.price === 0 ? `Pilih Paket ${plan.name}` : (isCustom ? "Hubungi Sales" : `Pilih Paket ${plan.name}`)}
                      <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                    </Link>
                  </div>
                );
              }) : (
                 <div className="col-span-3 text-center text-gray-500 py-12">Belum ada paket harga yang tersedia.</div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-white relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <div className="max-w-4xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">FAQ</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">Pertanyaan yang Sering Diajukan</h3>
            </div>
            
            {faqData ? (
              <FaqAccordion items={faqData} />
            ) : (
              <div className="space-y-6">
                <div 
                    className="prose prose-emerald max-w-none 
                               prose-h2:hidden
                               prose-p:bg-gray-50 prose-p:border prose-p:border-gray-100 prose-p:rounded-2xl prose-p:p-6 prose-p:shadow-sm hover:prose-p:shadow-md prose-p:transition-all prose-p:duration-300 prose-p:text-gray-600
                               prose-strong:text-lg prose-strong:text-gray-900 prose-strong:block prose-strong:mb-2 prose-strong:font-bold
                               prose-a:text-primary prose-a:underline hover:prose-a:text-primary-hover"
                    dangerouslySetInnerHTML={{ __html: faqContent }} 
                />
              </div>
            )}
          </div>
        </section>

        {/* Contact Section */}
        <section id="kontak" className="py-24 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">Kontak</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">Hubungi Kami</h3>
            </div>
            <div>
                <div 
                    className="prose prose-emerald max-w-none
                               prose-h2:hidden
                               prose-h3:text-center prose-h3:mb-8 prose-h3:mt-12 prose-h3:text-2xl prose-h3:font-bold prose-h3:text-gray-900
                               prose-p:text-lg prose-p:text-gray-600 prose-p:text-center prose-p:mb-12 prose-p:max-w-2xl prose-p:mx-auto
                               prose-ul:flex prose-ul:flex-col lg:prose-ul:flex-row prose-ul:justify-center prose-ul:gap-6 prose-ul:list-none prose-ul:pl-0
                               prose-li:flex-1 prose-li:min-w-[240px] prose-li:bg-white prose-li:border prose-li:border-gray-100 prose-li:rounded-2xl prose-li:p-8 prose-li:shadow-sm hover:prose-li:shadow-md prose-li:transition-all prose-li:duration-300 prose-li:flex prose-li:flex-col prose-li:gap-2 prose-li:text-gray-600 prose-li:items-center prose-li:text-center prose-li:m-0
                               prose-strong:text-xl prose-strong:text-gray-900 prose-strong:mb-1
                               prose-a:text-primary prose-a:underline hover:prose-a:text-primary-hover"
                    dangerouslySetInnerHTML={{ __html: contactContent }} 
                />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5"></div>
            <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Siap untuk digitalisasi rekrutmen Anda?</h2>
                <p className="text-lg text-gray-600 mb-10">Tinggalkan metode tes manual dan beralihlah ke platform modern yang efisien dan tepercaya.</p>
                <div className="flex justify-center gap-4">
                    <Link href="/register" className="bg-primary text-white font-bold px-8 py-4 rounded-full hover:bg-[var(--color-primary-hover)] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                        Daftar Sekarang
                    </Link>
                </div>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
                <img src="/full-logo.png" alt="Seleksia" className="h-8 mb-6 brightness-0 invert" style={{ filter: 'brightness(0) invert(1)' }} />
                <p className="text-sm max-w-md leading-relaxed">
                    Platform SaaS terdepan untuk Computer Based Test (CBT) dan asesmen psikologi, memberdayakan perusahaan dan institusi di seluruh Indonesia.
                </p>
            </div>
            <div>
                <h4 className="text-white font-semibold mb-4">Perusahaan</h4>
                <ul className="space-y-3 text-sm">
                    <li><Link href="#faq" className="hover:text-white transition-colors">Tentang Kami</Link></li>
                    <li><Link href="#kontak" className="hover:text-white transition-colors">Kontak</Link></li>
                </ul>
            </div>
            <div>
                <h4 className="text-white font-semibold mb-4">Legal</h4>
                <ul className="space-y-3 text-sm">
                    <li><Link href="/terms-and-conditions" className="hover:text-white transition-colors">Syarat & Ketentuan</Link></li>
                    <li><Link href="/refund-policy" className="hover:text-white transition-colors">Kebijakan Refund</Link></li>
                    <li><Link href="#faq" className="hover:text-white transition-colors">FAQ</Link></li>
                </ul>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-gray-800 text-sm text-center md:text-left flex flex-col md:flex-row justify-between items-center">
            <p>&copy; {new Date().getFullYear()} Seleksia by PT Contoh Solusi Digital. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
