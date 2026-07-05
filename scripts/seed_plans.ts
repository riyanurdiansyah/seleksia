import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding subscription plans...");
    
    // Clear existing plans
    await prisma.subscriptionPlan.deleteMany({});

    const plans = [
        {
            name: "Starter",
            price: 290000,
            priceText: "Rp 290rb",
            maxCandidates: 100,
            maxTests: 10,
            features: [
                "Keamanan Proctoring AI Dasar",
                "Live Monitoring Webcam"
            ],
            isPopular: false,
            sortOrder: 1
        },
        {
            name: "Business",
            price: 750000,
            priceText: "Rp 750rb",
            maxCandidates: 1000,
            maxTests: 50,
            features: [
                "Proctoring AI (Tab, Device, Face Lock)",
                "Ekspor PDF Laporan & Analitik",
                "Integrasi SMTP Email Mandiri"
            ],
            isPopular: true,
            sortOrder: 2
        },
        {
            name: "Enterprise",
            price: 0,
            priceText: "Custom Pricing",
            maxCandidates: -1, // Unlimited
            maxTests: -1,      // Unlimited
            features: [
                "Dedicated Server / VPS Deployment",
                "Dukungan CS Khusus 24/7",
                "Integrasi Whitelabel Kustom"
            ],
            isPopular: false,
            sortOrder: 3
        }
    ];

    for (const plan of plans) {
        await prisma.subscriptionPlan.create({
            data: plan
        });
        console.log(`Created plan: ${plan.name}`);
    }

    console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
