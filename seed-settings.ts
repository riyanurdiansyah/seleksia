import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const settings = [
    {
      key: "page_faq",
      value: `<h2>Frequently Asked Questions</h2>
<p><strong>1. Apa itu Seleksia?</strong><br>Seleksia adalah platform untuk melakukan tes psikologi dan asesmen secara online.</p>
<p><strong>2. Bagaimana cara mendaftar?</strong><br>Anda dapat menghubungi tim sales kami atau mendaftar melalui halaman registrasi.</p>
`
    },
    {
      key: "page_refund_policy",
      value: `<h2>Kebijakan Pengembalian Dana (Refund Policy)</h2>
<p>Kami berkomitmen untuk memberikan layanan terbaik. Namun, jika Anda tidak puas dengan layanan kami, berikut adalah kebijakan pengembalian dana kami:</p>
<ul>
<li>Pengembalian dana hanya dapat diproses dalam waktu 7 hari kerja sejak tanggal transaksi.</li>
<li>Permintaan pengembalian dana harus disertai dengan bukti pembayaran dan alasan yang valid.</li>
<li>Layanan yang sudah digunakan (seperti tes yang sudah diselesaikan) tidak dapat di-refund.</li>
</ul>
`
    },
    {
      key: "page_terms_and_conditions",
      value: `<h2>Syarat dan Ketentuan (Terms and Conditions)</h2>
<p>Selamat datang di platform kami. Dengan menggunakan layanan ini, Anda menyetujui syarat dan ketentuan berikut:</p>
<ol>
<li><strong>Penggunaan Layanan:</strong> Layanan ini hanya boleh digunakan untuk keperluan asesmen yang sah.</li>
<li><strong>Privasi Data:</strong> Kami menjaga kerahasiaan data pribadi dan hasil tes Anda sesuai dengan kebijakan privasi kami.</li>
<li><strong>Perubahan Syarat:</strong> Kami berhak mengubah syarat dan ketentuan ini sewaktu-waktu tanpa pemberitahuan sebelumnya.</li>
</ol>
`
    },
    {
      key: "page_contact",
      value: `<h2>Hubungi Kami</h2>
<p>Jika Anda memiliki pertanyaan atau kendala, silakan hubungi kami melalui informasi di bawah ini:</p>
<ul>
<li><strong>Email:</strong> support@seleksia.com</li>
<li><strong>Nomor Telepon:</strong> +62 851-1141-0005</li>
</ul>
`
    }
  ];

  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
  }

  console.log("Seeding complete.");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
