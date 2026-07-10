const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const settings = [
  {
    key: "page_terms_and_conditions",
    value: `
      <h2>Syarat dan Ketentuan Layanan (Terms of Service)</h2>
      <p>Terakhir Diperbarui: 10 Juli 2026</p>
      <p>Selamat datang di Seleksia. Dengan mengakses dan menggunakan layanan platform Seleksia, Anda setuju untuk terikat oleh Syarat dan Ketentuan berikut. Harap baca dengan saksama sebelum menggunakan layanan kami (sebagaimana disyaratkan oleh kebijakan standar <em>Payment Gateway</em>).</p>
      
      <h3>1. Identitas Perusahaan</h3>
      <p>Seleksia (selanjutnya disebut "Kami" atau "Platform") dikelola dan dioperasikan oleh <strong>PT Contoh Solusi Digital</strong>, sebuah perusahaan yang berkedudukan hukum di Indonesia.</p>
      
      <h3>2. Layanan Kami</h3>
      <p>Seleksia menyediakan platform <em>Software as a Service (SaaS)</em> untuk Computer Based Test (CBT) dan asesmen psikologi, mencakup sistem ujian online, proctoring otomatis, dan skoring instan. Layanan ini utamanya ditujukan untuk transaksi B2B (Business to Business).</p>

      <h3>3. Kebijakan Pembayaran & Penagihan</h3>
      <p>Semua pembayaran untuk paket langganan diproses dengan aman melalui Payment Gateway resmi. Pengguna setuju untuk memberikan informasi penagihan yang akurat dan sah. Akses ke paket premium akan diberikan seketika setelah sistem kami menerima notifikasi sukses dari Payment Gateway.</p>

      <h3>4. Kebijakan Penggunaan Data & Privasi</h3>
      <p>Kami sangat mematuhi regulasi perlindungan data pribadi (UU PDP). Data kandidat, soal ujian, dan hasil asesmen sepenuhnya merupakan hak milik Klien (Perusahaan pengguna). Kami menjamin seluruh data dienkripsi, disimpan secara aman di <em>cloud</em>, dan tidak akan pernah diperjualbelikan kepada pihak ketiga untuk alasan apapun.</p>
      
      <h3>5. Yurisdiksi dan Penyelesaian Sengketa</h3>
      <p>Segala bentuk perselisihan terkait penggunaan platform dan layanan pembayaran akan diselesaikan secara musyawarah mufakat. Apabila tidak tercapai kesepakatan, maka sengketa akan diselesaikan sesuai dengan hukum yang berlaku di wilayah Republik Indonesia melalui Pengadilan Negeri Jakarta Selatan.</p>
    `
  },
  {
    key: "page_refund_policy",
    value: `
      <h2>Kebijakan Pengembalian Dana (Refund Policy)</h2>
      <p>Terakhir Diperbarui: 10 Juli 2026</p>
      <p>Sebagai penyedia layanan digital (SaaS), Seleksia memberlakukan kebijakan pengembalian dana (refund) secara ketat untuk mematuhi regulasi transaksi e-commerce dan Payment Gateway.</p>

      <h3>1. Layanan Tanpa Pengembalian Dana (Non-Refundable)</h3>
      <p>Seluruh pembelian paket langganan (baik Bulanan maupun Tahunan) serta kuota kandidat sifatnya adalah final dan <strong>tidak dapat dikembalikan (non-refundable)</strong> apabila layanan telah digunakan, atau apabila kandidat telah memulai sesi ujian di platform kami.</p>

      <h3>2. Kondisi yang Memungkinkan Pengembalian Dana</h3>
      <p>Pengembalian dana penuh atau parsial hanya dapat diajukan dalam kondisi-kondisi khusus berikut:</p>
      <ul>
        <li>Terjadi kesalahan penagihan ganda (<em>double-billing</em>) akibat kegagalan sinkronisasi sistem pada Payment Gateway.</li>
        <li>Platform kami mengalami <em>downtime</em> penuh selama lebih dari 48 jam berturut-turut pada periode ujian yang telah dijadwalkan oleh Klien, yang sepenuhnya disebabkan oleh kesalahan server internal Seleksia (<em>SLA Breach</em>).</li>
      </ul>

      <h3>3. Prosedur Pengajuan Refund</h3>
      <p>Jika Anda memenuhi kriteria di atas, proses pengajuan refund wajib dilakukan selambat-lambatnya <strong>7 hari kerja</strong> setelah transaksi terjadi, dengan cara:</p>
      <ul>
        <li>Mengirimkan email formal ke <strong>finance@seleksia.com</strong> dengan subjek "Permintaan Refund - [Nama Perusahaan Anda]".</li>
        <li>Melampirkan bukti pembayaran yang sah dari bank atau receipt Payment Gateway, beserta kronologi kendala.</li>
      </ul>
      <p>Proses investigasi dan pengembalian dana (apabila disetujui) akan memakan waktu estimasi 7-14 hari kerja, dana akan dikembalikan ke rekening bank asal atau limit kartu kredit yang digunakan saat bertransaksi.</p>
    `
  },
  {
    key: "page_contact",
    value: `
      <h2>Informasi Kontak Resmi</h2>
      <p>Untuk pertanyaan terkait penjualan, keluhan pembayaran (Payment Gateway), dukungan teknis, atau tagihan, Anda dapat menghubungi tim operasional Seleksia melalui saluran resmi kami di bawah ini:</p>
      
      <h3>Alamat Kantor (Headquarters)</h3>
      <p>
        <strong>PT Contoh Solusi Digital (Seleksia)</strong><br/>
        Gedung Inovasi Seleksia Lt. 12<br/>
        Jl. Jend. Sudirman Kav. 50, Jakarta Pusat<br/>
        DKI Jakarta 12190, Indonesia
      </p>

      <h3>Saluran Komunikasi Pelanggan</h3>
      <ul>
        <li><strong>Email Layanan Pelanggan (Umum):</strong> support@seleksia.com</li>
        <li><strong>Email Finance & Penagihan:</strong> finance@seleksia.com</li>
        <li><strong>WhatsApp Official Sales:</strong> <a href="https://wa.me/6285111410005" target="_blank">+62 851-1141-0005</a></li>
        <li><strong>Telepon Kantor (Hotline):</strong> (021) 1234-5678</li>
      </ul>
      
      <p><em>Jam Operasional Dukungan Pelanggan: Senin - Jumat (09:00 - 17:00 WIB), tidak termasuk hari libur nasional.</em></p>
    `
  }
];

async function main() {
  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
  }
  console.log("Successfully seeded legal & contact settings!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
