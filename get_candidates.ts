const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const candidates = await prisma.candidate.findMany({ select: { companyId: true, displayId: true, email: true }, orderBy: { displayId: 'desc' }, take: 10 });
    console.log(candidates);
}
main().catch(console.error).finally(() => prisma.$disconnect());
