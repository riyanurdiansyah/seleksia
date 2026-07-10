const { PrismaClient, Role } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const role = "superadmin";
    const path = "/master/rbac";
    
    console.log("Role.superadmin is:", Role.superadmin);
    console.log("role === Role.superadmin:", role === Role.superadmin);
    
    const menus = await prisma.menu.findMany({ select: { id: true, path: true } });
    
    let matchedMenuId = null;
    let longestMatchLength = 0;

    for (const menu of menus) {
        if (!menu.path) continue;
        if (path === menu.path || path.startsWith(menu.path + "/")) {
            if (menu.path.length > longestMatchLength) {
                longestMatchLength = menu.path.length;
                matchedMenuId = menu.id;
            }
        }
    }
    console.log("Matched menu id:", matchedMenuId);
    
    const access = await prisma.roleMenuAccess.findFirst({
        where: {
            role: role,
            menuId: matchedMenuId,
            canRead: true
        }
    });
    console.log("Access:", !!access);
}
check().then(() => process.exit(0)).catch(console.error);
