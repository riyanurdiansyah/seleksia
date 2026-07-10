const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const data = {
  title: "Jenis Soal & Asesmen Terlengkap",
  subtitle: "Platform kami mendukung berbagai format soal untuk mengukur setiap dimensi psikologis dan kognitif kandidat secara akurat.",
  items: [
    { icon: "format_list_bulleted", title: "Pilihan Ganda", desc: "Format standar dengan dukungan pembobotan nilai tiap opsi jawaban (Weighted Multiple Choice)." },
    { icon: "linear_scale", title: "Skala Likert", desc: "Sempurna untuk tes inventori kepribadian, mengukur spektrum persetujuan secara presisi." },
    { icon: "rule", title: "Forced Choice (Ipsatif)", desc: "Mengharuskan kandidat memilih antara pernyataan, ideal untuk alat tes seperti DISC atau PAPI Kostick." },
    { icon: "functions", title: "Deret Angka", desc: "Tes logika dan penalaran aritmatika, dari pola dasar hingga kompleks." },
    { icon: "imagesmode", title: "Pola Gambar (Spasial)", desc: "Soal berbasis gambar dan matriks untuk mengukur IQ (seperti CFIT, IST, atau TIU)." },
    { icon: "edit_note", title: "Esai Bebas", desc: "Jawaban uraian panjang untuk mengukur kedalaman analisis dan struktur berpikir kandidat." }
  ],
  customTest: {
    title: "Butuh Alat Tes Khusus (Custom)?",
    desc: "Kami memahami setiap perusahaan memiliki kriteria unik. Tim psikolog dan developer kami siap merancang, memvalidasi, dan mendigitalkan alat tes kustom khusus untuk perusahaan Anda.",
    buttonText: "Konsultasi Custom Test",
    buttonLink: "#kontak"
  }
};

async function main() {
  await prisma.platformSetting.upsert({
    where: { key: 'page_question_types' },
    update: { value: JSON.stringify(data) },
    create: {
      key: 'page_question_types',
      value: JSON.stringify(data)
    }
  });
  console.log("Successfully seeded page_question_types setting!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
