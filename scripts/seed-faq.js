const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const faqData = [
  {
    question: "Apa itu Seleksia?",
    answer: "Seleksia adalah platform rekrutmen dan asesmen psikologi digital end-to-end. Kami memfasilitasi perusahaan untuk melakukan ujian CBT (Computer Based Test) dan psikotes secara online dengan sistem pengawasan (proctoring) otomatis."
  },
  {
    question: "Apakah sistem ujian di Seleksia aman dari kecurangan?",
    answer: "Sangat aman. Seleksia dilengkapi dengan fitur Anti-Kecurangan (Proctoring) canggih yang mencakup deteksi wajah via webcam, penguncian tab browser, larangan copy-paste, hingga pelacakan perpindahan layar ganda."
  },
  {
    question: "Berapa kapasitas maksimal kandidat yang bisa mengikuti tes bersamaan?",
    answer: "Berkat arsitektur cloud kami yang tangguh, Seleksia dapat menangani ribuan kandidat secara bersamaan (concurrent users) tanpa kendala lag atau downtime, terutama untuk paket Pro dan Enterprise."
  },
  {
    question: "Apakah laporan hasil psikotes bisa langsung keluar?",
    answer: "Ya! Sistem skoring otomatis kami akan langsung menghitung hasil ujian berdasarkan norma dan bobot yang telah ditentukan segera setelah kandidat menyelesaikan tes. Laporan dapat diunduh dalam format PDF atau Excel."
  },
  {
    question: "Bisakah perusahaan menggunakan format alat tes atau soal sendiri (Custom)?",
    answer: "Tentu saja. Perusahaan dapat menginput alat tes mereka sendiri melalui dashboard admin. Selain itu, tim psikolog kami juga menyediakan jasa pembuatan dan validasi alat tes custom yang disesuaikan dengan kebutuhan kompetensi perusahaan Anda."
  },
  {
    question: "Bagaimana cara berlangganan dan mendaftar?",
    answer: "Anda dapat mencoba paket Basic kami secara gratis untuk 50 kandidat pertama. Jika ingin fitur lengkap, Anda bisa langsung memilih paket Pro di halaman utama atau menghubungi tim sales kami untuk paket Enterprise kustomisasi penuh."
  }
];

async function main() {
  await prisma.platformSetting.upsert({
    where: { key: 'page_faq' },
    update: { value: JSON.stringify(faqData) },
    create: {
      key: 'page_faq',
      value: JSON.stringify(faqData)
    }
  });
  console.log("Successfully seeded page_faq setting as JSON!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
