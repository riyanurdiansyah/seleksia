import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

    console.log("Seeding general instructions...");

    // First delete existing general instructions to prevent duplicates
    await prisma.instruction.deleteMany({
        where: { type: "general" }
    });

    await prisma.company.upsert({
        where: { id: "default-company-id" },
        update: {},
        create: {
            id: "default-company-id",
            name: "Default Company",
            slug: "default",
        }
    });

    for (const content of defaultGeneralInstructions) {
        await prisma.instruction.create({
            data: {
                content,
                type: "general",
                companyId: "default-company-id",
            }
        });
    }

    console.log("Successfully seeded", defaultGeneralInstructions.length, "general instructions!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
