import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.platformSetting.findMany({
        where: { key: { in: ['ANTHROPIC_MAX_TOKENS', 'ANTHROPIC_MODEL'] } }
    });
    console.log("Settings in DB:", settings);
}

main().finally(() => prisma.$disconnect());
