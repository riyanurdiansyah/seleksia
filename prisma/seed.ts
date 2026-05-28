import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...\n");

    // ===== 1. Clear existing data =====
    console.log("🗑️  Clearing existing data...");
    await prisma.violation.deleteMany();
    await prisma.examAnswer.deleteMany();
    await prisma.examSession.deleteMany();
    await prisma.testAssignment.deleteMany();
    await prisma.question.deleteMany();
    await prisma.test.deleteMany();
    await prisma.candidate.deleteMany();
    await prisma.company.deleteMany();

    console.log("🏢 Creating default company...");
    await prisma.company.create({
        data: {
            id: "default-company-id",
            name: "Default Company",
            slug: "default",
        }
    });

    // ===== 2. Create Admin & Proctor =====
    console.log("👤 Creating admin & proctor...");
    const adminPassword = await bcrypt.hash("admin123", 10);
    const proctorPassword = await bcrypt.hash("proctor123", 10);

    await prisma.candidate.create({
        data: {
            displayId: "PSK-001",
            name: "Admin Psikoest",
            email: "admin@psikoest.com",
            password: adminPassword,
            role: "admin",
            accessType: "permanent",
            status: "registered",
            companyId: "default-company-id",
        },
    });

    await prisma.candidate.create({
        data: {
            displayId: "PSK-002",
            name: "Dr. Proctor Utama",
            email: "proctor@psikoest.com",
            password: proctorPassword,
            role: "proctor",
            accessType: "permanent",
            status: "registered",
            companyId: "default-company-id",
        },
    });

    // ===== 3. Create Candidates =====
    console.log("👥 Creating candidates...");
    const candidatePassword = await bcrypt.hash("test123", 10);

    const candidates = await Promise.all([
        prisma.candidate.create({
            data: {
                displayId: "PSK-003",
                name: "Andi Pratama",
                email: "andi@test.com",
                phone: "08123456001",
                password: candidatePassword,
                role: "user",
                batch: "Batch 2026-A",
                accessType: "permanent",
                status: "registered",
                companyId: "default-company-id",
            },
        }),
        prisma.candidate.create({
            data: {
                displayId: "PSK-004",
                name: "Budi Santoso",
                email: "budi@test.com",
                phone: "08123456002",
                password: candidatePassword,
                role: "user",
                batch: "Batch 2026-A",
                accessType: "permanent",
                status: "registered",
                companyId: "default-company-id",
            },
        }),
        prisma.candidate.create({
            data: {
                displayId: "PSK-005",
                name: "Citra Dewi",
                email: "citra@test.com",
                phone: "08123456003",
                password: candidatePassword,
                role: "user",
                batch: "Batch 2026-A",
                accessType: "permanent",
                status: "registered",
                companyId: "default-company-id",
            },
        }),
        prisma.candidate.create({
            data: {
                displayId: "PSK-006",
                name: "Dian Kusuma",
                email: "dian@test.com",
                phone: "08123456004",
                password: candidatePassword,
                role: "user",
                batch: "Batch 2026-B",
                accessType: "permanent",
                status: "registered",
                companyId: "default-company-id",
            },
        }),
        prisma.candidate.create({
            data: {
                displayId: "PSK-007",
                name: "Eva Rahmawati",
                email: "eva@test.com",
                phone: "08123456005",
                password: candidatePassword,
                role: "user",
                batch: "Batch 2026-B",
                accessType: "permanent",
                status: "registered",
                companyId: "default-company-id",
            },
        }),
    ]);

    // ===== 4. Create Tests =====
    console.log("📝 Creating tests...\n");

    // --- Intelligence Test ---
    const intelligenceTest = await prisma.test.create({
        data: {
            displayId: "TST-001",
            name: "Tes Intelegensi Umum (TIU)",
            category: "intelligence",
            questionType: "number_series",
            description: "Tes kemampuan kognitif dan penalaran logis",
            duration: 30,
            status: "published",
            companyId: "default-company-id",
        },
    });

    await prisma.question.createMany({
        data: [
            { testId: intelligenceTest.id, displayId: "q-1", type: "number_series", text: "Lanjutkan deret: 2, 4, 8, 16, ...", options: ["24", "32", "30", "28"], correctAnswer: "32", sortOrder: 0 },
            { testId: intelligenceTest.id, displayId: "q-2", type: "number_series", text: "Lanjutkan deret: 3, 6, 12, 24, ...", options: ["36", "48", "42", "30"], correctAnswer: "48", sortOrder: 1 },
            { testId: intelligenceTest.id, displayId: "q-3", type: "number_series", text: "Lanjutkan deret: 1, 1, 2, 3, 5, 8, ...", options: ["11", "12", "13", "10"], correctAnswer: "13", sortOrder: 2 },
            { testId: intelligenceTest.id, displayId: "q-4", type: "multiple_choice", text: "Jika semua kucing adalah hewan, dan semua hewan bernapas, maka...", options: ["Semua yang bernapas adalah kucing", "Semua kucing bernapas", "Semua hewan adalah kucing", "Tidak semua kucing bernapas"], correctAnswer: "Semua kucing bernapas", sortOrder: 3 },
            { testId: intelligenceTest.id, displayId: "q-5", type: "multiple_choice", text: "Ali lebih tinggi dari Budi. Budi lebih tinggi dari Cici. Siapa yang paling pendek?", options: ["Ali", "Budi", "Cici", "Sama tinggi"], correctAnswer: "Cici", sortOrder: 4 },
            { testId: intelligenceTest.id, displayId: "q-6", type: "number_series", text: "Lanjutkan deret: 5, 10, 20, 40, ...", options: ["60", "70", "80", "100"], correctAnswer: "80", sortOrder: 5 },
            { testId: intelligenceTest.id, displayId: "q-7", type: "multiple_choice", text: "Jika 3x + 5 = 20, berapa nilai x?", options: ["3", "4", "5", "6"], correctAnswer: "5", sortOrder: 6 },
            { testId: intelligenceTest.id, displayId: "q-8", type: "multiple_choice", text: "DOKTER : RUMAH SAKIT = GURU : ?", options: ["Universitas", "Sekolah", "Perpustakaan", "Laboratorium"], correctAnswer: "Sekolah", sortOrder: 7 },
            { testId: intelligenceTest.id, displayId: "q-9", type: "multiple_choice", text: "Manakah yang TIDAK termasuk dalam kelompok? Apel, Mangga, Wortel, Jeruk", options: ["Apel", "Mangga", "Wortel", "Jeruk"], correctAnswer: "Wortel", sortOrder: 8 },
            { testId: intelligenceTest.id, displayId: "q-10", type: "number_series", text: "Lanjutkan deret: 100, 95, 85, 70, 50, ...", options: ["30", "25", "20", "35"], correctAnswer: "25", sortOrder: 9 },
        ].map(q => ({ ...q, companyId: "default-company-id" })) as any,
    });

    // --- Personality Test ---
    const personalityTest = await prisma.test.create({
        data: {
            displayId: "TST-002",
            name: "Tes Kepribadian MBTI",
            category: "personality",
            questionType: "forced_choice",
            description: "Tes untuk menganalisis tipe kepribadian dan preferensi perilaku",
            duration: 25,
            status: "published",
            companyId: "default-company-id",
        },
    });

    await prisma.question.createMany({
        data: [
            { testId: personalityTest.id, displayId: "q-1", type: "forced_choice", text: "Dalam situasi sosial, saya lebih suka...", options: ["Berbicara dengan banyak orang baru", "Berbicara mendalam dengan satu atau dua orang", "Mengamati dari kejauhan", "Memimpin percakapan kelompok"], sortOrder: 0 },
            { testId: personalityTest.id, displayId: "q-2", type: "forced_choice", text: "Saat mengambil keputusan, saya lebih mengandalkan...", options: ["Fakta dan data yang konkret", "Intuisi dan perasaan", "Analisis logis", "Pengalaman masa lalu"], sortOrder: 1 },
            { testId: personalityTest.id, displayId: "q-3", type: "forced_choice", text: "Saya merasa lebih berenergi setelah...", options: ["Menghadiri pesta besar", "Membaca buku sendirian", "Berdiskusi dalam kelompok kecil", "Berolahraga sendiri"], sortOrder: 2 },
            { testId: personalityTest.id, displayId: "q-4", type: "forced_choice", text: "Dalam bekerja, saya lebih suka...", options: ["Mengikuti rencana yang terstruktur", "Fleksibel dan spontan", "Membuat rencana sendiri", "Mengikuti arahan pemimpin"], sortOrder: 3 },
            { testId: personalityTest.id, displayId: "q-5", type: "forced_choice", text: "Ketika menghadapi konflik, saya cenderung...", options: ["Langsung menghadapinya", "Menghindari konfrontasi", "Mencari kompromi", "Memikirkan solusi sendirian dulu"], sortOrder: 4 },
            { testId: personalityTest.id, displayId: "q-6", type: "forced_choice", text: "Lingkungan kerja ideal bagi saya adalah...", options: ["Kantor terbuka yang ramai dan dinamis", "Ruangan pribadi yang tenang", "Campuran area kolaborasi dan fokus", "Bekerja dari rumah sendiri"], sortOrder: 5 },
            { testId: personalityTest.id, displayId: "q-7", type: "forced_choice", text: "Saya lebih menikmati pekerjaan yang...", options: ["Rutin dan dapat diprediksi", "Penuh tantangan dan variasi", "Membutuhkan kreativitas", "Melibatkan interaksi sosial"], sortOrder: 6 },
            { testId: personalityTest.id, displayId: "q-8", type: "forced_choice", text: "Ketika teman memiliki masalah, saya biasanya...", options: ["Memberikan solusi praktis", "Mendengarkan dengan empati", "Menganalisis masalahnya", "Mengalihkan perhatiannya"], sortOrder: 7 },
            { testId: personalityTest.id, displayId: "q-9", type: "forced_choice", text: "Saya menilai diri saya lebih sebagai orang yang...", options: ["Pemikir strategis", "Pelaksana yang efisien", "Inovator kreatif", "Penghubung antar orang"], sortOrder: 8 },
            { testId: personalityTest.id, displayId: "q-10", type: "forced_choice", text: "Dalam tekanan deadline, saya biasanya...", options: ["Tetap tenang dan fokus", "Merasa cemas tapi tetap produktif", "Bekerja lebih baik di bawah tekanan", "Delegasi tugas ke orang lain"], sortOrder: 9 },
        ].map(q => ({ ...q, companyId: "default-company-id" })) as any,
    });

    // --- Aptitude Test ---
    const aptitudeTest = await prisma.test.create({
        data: {
            displayId: "TST-003",
            name: "Tes Bakat Skolastik",
            category: "aptitude",
            questionType: "multiple_choice",
            description: "Mengukur kemampuan verbal, numerik, dan penalaran abstrak",
            duration: 45,
            status: "published",
            companyId: "default-company-id",
        },
    });

    await prisma.question.createMany({
        data: [
            { testId: aptitudeTest.id, displayId: "q-1", type: "multiple_choice", text: "Sinonim dari kata 'PARADOKS' adalah...", options: ["Kontradiksi", "Paralel", "Paradigma", "Paradiga"], correctAnswer: "Kontradiksi", sortOrder: 0 },
            { testId: aptitudeTest.id, displayId: "q-2", type: "multiple_choice", text: "Antonim dari kata 'EFISIEN' adalah...", options: ["Produktif", "Boros", "Hemat", "Cepat"], correctAnswer: "Boros", sortOrder: 1 },
            { testId: aptitudeTest.id, displayId: "q-3", type: "multiple_choice", text: "Jika sebuah toko memberikan diskon 20% dari harga Rp 250.000, berapa yang harus dibayar?", options: ["Rp 200.000", "Rp 225.000", "Rp 180.000", "Rp 150.000"], correctAnswer: "Rp 200.000", sortOrder: 2 },
            { testId: aptitudeTest.id, displayId: "q-4", type: "multiple_choice", text: "Sebuah mobil menempuh 120 km dalam 2 jam. Berapa kecepatannya?", options: ["50 km/jam", "55 km/jam", "60 km/jam", "65 km/jam"], correctAnswer: "60 km/jam", sortOrder: 3 },
            { testId: aptitudeTest.id, displayId: "q-5", type: "multiple_choice", text: "PALU : TUKANG KAYU = STETOSKOP : ?", options: ["Perawat", "Dokter", "Apoteker", "Bidan"], correctAnswer: "Dokter", sortOrder: 4 },
            { testId: aptitudeTest.id, displayId: "q-6", type: "multiple_choice", text: "Jika rata-rata dari 5 angka adalah 12, berapa jumlah kelima angka tersebut?", options: ["48", "55", "60", "65"], correctAnswer: "60", sortOrder: 5 },
            { testId: aptitudeTest.id, displayId: "q-7", type: "multiple_choice", text: "PANAS : DINGIN = TERANG : ?", options: ["Sinar", "Cahaya", "Gelap", "Redup"], correctAnswer: "Gelap", sortOrder: 6 },
            { testId: aptitudeTest.id, displayId: "q-8", type: "multiple_choice", text: "Berapa 15% dari 400?", options: ["45", "55", "60", "75"], correctAnswer: "60", sortOrder: 7 },
            { testId: aptitudeTest.id, displayId: "q-9", type: "multiple_choice", text: "Jika hari ini Selasa, hari apa 100 hari lagi?", options: ["Kamis", "Rabu", "Jumat", "Sabtu"], correctAnswer: "Kamis", sortOrder: 8 },
            { testId: aptitudeTest.id, displayId: "q-10", type: "multiple_choice", text: "Manakah kesimpulan yang benar? Semua burung memiliki sayap. Penguin adalah burung.", options: ["Penguin bisa terbang", "Penguin memiliki sayap", "Semua yang bersayap adalah burung", "Penguin bukan burung"], correctAnswer: "Penguin memiliki sayap", sortOrder: 9 },
            { testId: aptitudeTest.id, displayId: "q-11", type: "multiple_choice", text: "Sebuah persegi panjang memiliki panjang 12 cm dan lebar 8 cm. Berapa luasnya?", options: ["80 cm²", "96 cm²", "100 cm²", "88 cm²"], correctAnswer: "96 cm²", sortOrder: 10 },
            { testId: aptitudeTest.id, displayId: "q-12", type: "multiple_choice", text: "KUPU-KUPU : KEPOMPONG = KATAK : ?", options: ["Telur", "Berudu", "Larva", "Nimfa"], correctAnswer: "Berudu", sortOrder: 11 },
        ].map(q => ({ ...q, companyId: "default-company-id" })) as any,
    });

    // --- Projective Test ---
    const projectiveTest = await prisma.test.create({
        data: {
            displayId: "TST-004",
            name: "Tes Menggambar & Interpretasi",
            category: "projective",
            questionType: "essay",
            description: "Tes proyektif untuk mengukur aspek emosional dan kepribadian mendalam",
            duration: 20,
            status: "published",
            companyId: "default-company-id",
        },
    });

    await prisma.question.createMany({
        data: [
            { testId: projectiveTest.id, displayId: "q-1", type: "essay", text: "Lihat gambar berikut. Ceritakan apa yang sedang terjadi dalam gambar ini, apa yang dipikirkan dan dirasakan karakter, serta apa yang akan terjadi selanjutnya.", options: [], sortOrder: 0 },
            { testId: projectiveTest.id, displayId: "q-2", type: "essay", text: "Bayangkan Anda berada di sebuah hutan. Jelaskan hutan tersebut, bagaimana perasaan Anda, dan apa yang akan Anda lakukan.", options: [], sortOrder: 1 },
            { testId: projectiveTest.id, displayId: "q-3", type: "essay", text: "Jika Anda bisa menjadi hewan apa saja, hewan apa yang akan Anda pilih dan mengapa?", options: [], sortOrder: 2 },
            { testId: projectiveTest.id, displayId: "q-4", type: "essay", text: "Gambarkan rumah impian Anda. Jelaskan detail tentang rumah tersebut — letaknya, ukurannya, siapa yang tinggal di sana, dan mengapa Anda memilih desain tersebut.", options: [], sortOrder: 3 },
            { testId: projectiveTest.id, displayId: "q-5", type: "essay", text: "Ceritakan tentang mimpi yang paling berkesan bagi Anda. Apa yang terjadi dalam mimpi tersebut dan bagaimana perasaan Anda saat terbangun?", options: [], sortOrder: 4 },
        ].map(q => ({ ...q, companyId: "default-company-id" })) as any,
    });

    // --- Additional Intelligence Test (Likert) ---
    const likertTest = await prisma.test.create({
        data: {
            displayId: "TST-005",
            name: "Skala Kecerdasan Emosional",
            category: "intelligence",
            questionType: "likert_scale",
            description: "Mengukur tingkat kecerdasan emosional dan kemampuan mengelola emosi",
            duration: 15,
            status: "published",
            companyId: "default-company-id",
        },
    });

    await prisma.question.createMany({
        data: [
            { testId: likertTest.id, displayId: "q-1", type: "likert_scale", text: "Saya mampu mengenali emosi yang saya rasakan saat itu juga.", options: ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"], sortOrder: 0 },
            { testId: likertTest.id, displayId: "q-2", type: "likert_scale", text: "Saya dapat tetap tenang dalam situasi yang menekan.", options: ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"], sortOrder: 1 },
            { testId: likertTest.id, displayId: "q-3", type: "likert_scale", text: "Saya memahami bagaimana perasaan orang lain dengan mudah.", options: ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"], sortOrder: 2 },
            { testId: likertTest.id, displayId: "q-4", type: "likert_scale", text: "Saya mampu memotivasi diri sendiri untuk mencapai tujuan.", options: ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"], sortOrder: 3 },
            { testId: likertTest.id, displayId: "q-5", type: "likert_scale", text: "Saya dapat mengelola hubungan interpersonal dengan baik.", options: ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"], sortOrder: 4 },
            { testId: likertTest.id, displayId: "q-6", type: "likert_scale", text: "Saya mudah beradaptasi dengan perubahan yang tiba-tiba.", options: ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"], sortOrder: 5 },
            { testId: likertTest.id, displayId: "q-7", type: "likert_scale", text: "Saya mampu mengendalikan kemarahan saya.", options: ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"], sortOrder: 6 },
            { testId: likertTest.id, displayId: "q-8", type: "likert_scale", text: "Saya sering memikirkan perasaan orang sebelum berbicara.", options: ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"], sortOrder: 7 },
        ].map(q => ({ ...q, companyId: "default-company-id" })) as any,
    });

    console.log("   ✅ TST-001: Tes Intelegensi Umum (10 soal)");
    console.log("   ✅ TST-002: Tes Kepribadian MBTI (10 soal)");
    console.log("   ✅ TST-003: Tes Bakat Skolastik (12 soal)");
    console.log("   ✅ TST-004: Tes Menggambar & Interpretasi (5 soal)");
    console.log("   ✅ TST-005: Skala Kecerdasan Emosional (8 soal)");

    // ===== 5. Create Assignments =====
    console.log("\n📋 Creating assignments...");

    // Andi gets 3 tests: Intelligence → Personality → Aptitude
    await prisma.testAssignment.createMany({
        data: [
            { candidateId: candidates[0].id, testId: intelligenceTest.id, sortOrder: 0 },
            { candidateId: candidates[0].id, testId: personalityTest.id, sortOrder: 1 },
            { candidateId: candidates[0].id, testId: aptitudeTest.id, sortOrder: 2 },
        ],
    });

    // Budi gets 2 tests: Personality → Likert
    await prisma.testAssignment.createMany({
        data: [
            { candidateId: candidates[1].id, testId: personalityTest.id, sortOrder: 0 },
            { candidateId: candidates[1].id, testId: likertTest.id, sortOrder: 1 },
        ],
    });

    // Citra gets all 5 tests
    await prisma.testAssignment.createMany({
        data: [
            { candidateId: candidates[2].id, testId: intelligenceTest.id, sortOrder: 0 },
            { candidateId: candidates[2].id, testId: personalityTest.id, sortOrder: 1 },
            { candidateId: candidates[2].id, testId: aptitudeTest.id, sortOrder: 2 },
            { candidateId: candidates[2].id, testId: projectiveTest.id, sortOrder: 3 },
            { candidateId: candidates[2].id, testId: likertTest.id, sortOrder: 4 },
        ],
    });

    // Dian gets 1 test: Aptitude
    await prisma.testAssignment.createMany({
        data: [
            { candidateId: candidates[3].id, testId: aptitudeTest.id, sortOrder: 0 },
        ],
    });

    // Eva gets 2 tests: Intelligence → Projective
    await prisma.testAssignment.createMany({
        data: [
            { candidateId: candidates[4].id, testId: intelligenceTest.id, sortOrder: 0 },
            { candidateId: candidates[4].id, testId: projectiveTest.id, sortOrder: 1 },
        ],
    });

    console.log("   ✅ Andi Pratama → 3 tests (Intelligence, Personality, Aptitude)");
    console.log("   ✅ Budi Santoso → 2 tests (Personality, Likert)");
    console.log("   ✅ Citra Dewi → 5 tests (all)");
    console.log("   ✅ Dian Kusuma → 1 test (Aptitude)");
    console.log("   ✅ Eva Rahmawati → 2 tests (Intelligence, Projective)");

    console.log("\n========================================");
    console.log("🎉 Seeding complete!");
    console.log("========================================\n");
    console.log("📌 Login credentials:");
    console.log("   Admin:    admin@psikoest.com / admin123");
    console.log("   Proctor:  proctor@psikoest.com / proctor123");
    console.log("   Candidates (all): test123");
    console.log("     - andi@test.com (PSK-003)");
    console.log("     - budi@test.com (PSK-004)");
    console.log("     - citra@test.com (PSK-005)");
    console.log("     - dian@test.com (PSK-006)");
    console.log("     - eva@test.com (PSK-007)");
    console.log("");

    // ===== 6. Create General Instructions =====
    console.log("\n📜 Seeding instructions...");

    await prisma.instruction.deleteMany({
        where: { type: "general" }
    });

    const defaultGeneralInstructions = [
        "Ujian ini dibatasi waktu secara ketat. Begitu dimulai, waktu tidak bisa dijeda.",
        "Kamera Anda harus tetap aktif dan wajah Anda harus terlihat jelas selama seluruh proses ujian.",
        "Dilarang berpindah tab, membuka aplikasi lain (Alt+Tab), atau meminimalkan browser. Pelanggaran berulang dapat mengakibatkan diskualifikasi otomatis.",
        "Fitur klik kanan, copy, dan paste dinonaktifkan secara otomatis selama ujian berlangsung.",
        "Jawaban Anda akan tersimpan secara otomatis setiap kali Anda memilih atau mengubah pilihan jawaban.",
        "Jika waktu ujian (timer) mencapai angka nol, ujian Anda akan otomatis dikirim (ter-submit).",
        "Sistem proctoring AI akan mengambil foto secara acak selama ujian untuk keperluan verifikasi.",
        "Hanya boleh ada satu wajah yang tertangkap di dalam bingkai kamera selama ujian berlangsung."
    ];

    for (const content of defaultGeneralInstructions) {
        await prisma.instruction.create({
            data: {
                content,
                type: "general",
                companyId: "default-company-id",
            }
        });
    }
    console.log(`   ✅ Seeded ${defaultGeneralInstructions.length} general instructions`);
    console.log("");

}

main()
    .catch((e) => {
        console.error("❌ Seeding error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
