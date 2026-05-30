import { prisma } from "../lib/prisma";

async function main() {
  const menus = await prisma.menu.findMany({
    orderBy: { sortOrder: 'asc' }
  });
  console.log("=== DB MENUS ===");
  console.log(JSON.stringify(menus, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
