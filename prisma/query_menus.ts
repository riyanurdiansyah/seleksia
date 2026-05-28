import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const menus = await prisma.menu.findMany({
        include: {
            submenus: true
        }
    });
    console.log(JSON.stringify(menus, null, 2));
}
main();
