const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding subscription plans...");

    const plans = [
        {
            name: "Free",
            price: 0,
            priceText: "Gratis",
            maxCandidates: 3,
            maxTests: 1,
            features: ["3 Kandidat", "1 Paket Soal", "Akses Dashboard", "Proctoring Dasar"],
            isPopular: false,
            sortOrder: 0,
        },
        {
            name: "Starter",
            price: 290000,
            priceText: "Rp 290rb / bulan",
            maxCandidates: 100,
            maxTests: 10,
            features: ["100 Kandidat", "10 Paket Soal", "Proctoring AI", "Email Broadcast", "Laporan Hasil"],
            isPopular: true,
            sortOrder: 1,
        },
        {
            name: "Business",
            price: 750000,
            priceText: "Rp 750rb / bulan",
            maxCandidates: 1000,
            maxTests: 50,
            features: ["1000 Kandidat", "50 Paket Soal", "Proctoring AI", "Email & WhatsApp", "Laporan AI", "Custom Branding"],
            isPopular: false,
            sortOrder: 2,
        },
        {
            name: "Enterprise",
            price: 0,
            priceText: "Custom",
            maxCandidates: -1,
            maxTests: -1,
            features: ["Unlimited Kandidat", "Unlimited Paket Soal", "Semua Fitur", "Dedicated Support", "SLA"],
            isPopular: false,
            sortOrder: 3,
        },
    ];

    for (const plan of plans) {
        const existing = await prisma.subscriptionPlan.findFirst({
            where: { name: plan.name }
        });

        if (existing) {
            await prisma.subscriptionPlan.update({
                where: { id: existing.id },
                data: {
                    price: plan.price,
                    priceText: plan.priceText,
                    maxCandidates: plan.maxCandidates,
                    maxTests: plan.maxTests,
                    features: plan.features,
                    isPopular: plan.isPopular,
                    sortOrder: plan.sortOrder,
                },
            });
            console.log(`  ✅ Updated: ${plan.name}`);
        } else {
            await prisma.subscriptionPlan.create({ data: plan });
            console.log(`  ✅ Created: ${plan.name}`);
        }
    }

    console.log("\n🎉 Seeding complete!");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
