import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Check if 'Konten' parent menu exists
    let kontenMenu = await prisma.menu.findFirst({
        where: { name: 'Konten' }
    });

    if (!kontenMenu) {
        kontenMenu = await prisma.menu.create({
            data: {
                name: 'Konten',
                path: null,
                icon: 'edit_document',
                sortOrder: 10,
            }
        });
        console.log("Created parent menu 'Konten'");
    }

    // Check if 'Artikel' submenu exists
    const artikelMenu = await prisma.menu.findFirst({
        where: { name: 'Artikel', parentId: kontenMenu.id }
    });

    if (!artikelMenu) {
        const newArtikelMenu = await prisma.menu.create({
            data: {
                name: 'Artikel',
                path: '/konten',
                icon: 'article',
                parentId: kontenMenu.id,
                sortOrder: 1,
            }
        });
        
        // Add role access for superadmin and admin
        await prisma.roleMenuAccess.createMany({
            data: [
                { role: 'superadmin', menuId: newArtikelMenu.id, canRead: true, canCreate: true, canUpdate: true, canDelete: true },
                { role: 'admin', menuId: newArtikelMenu.id, canRead: true, canCreate: true, canUpdate: true, canDelete: true }
            ]
        });

        // Add access to parent menu as well if not exists
        const parentAccess = await prisma.roleMenuAccess.findFirst({ where: { menuId: kontenMenu.id, role: 'superadmin' } });
        if (!parentAccess) {
             await prisma.roleMenuAccess.createMany({
                data: [
                    { role: 'superadmin', menuId: kontenMenu.id, canRead: true, canCreate: false, canUpdate: false, canDelete: false },
                    { role: 'admin', menuId: kontenMenu.id, canRead: true, canCreate: false, canUpdate: false, canDelete: false }
                ]
            });
        }
        
        console.log("Created 'Artikel' submenu and granted access.");
    } else {
        console.log("'Artikel' menu already exists.");
    }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
