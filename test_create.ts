import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const companyId = 'cmpw50hao000cs80isyhearqo'; // User's company
    const count = await prisma.candidate.count();
    const displayId = `PSK-${String(count + 1).padStart(3, "0")}`;
    console.log("Count:", count, "Next displayId:", displayId);
    
    // Check if displayId already exists
    const exists = await prisma.candidate.findUnique({
      where: {
        companyId_displayId: { companyId, displayId }
      }
    });
    console.log("Exists?", !!exists);
}
main().catch(console.error).finally(() => prisma.$disconnect());
