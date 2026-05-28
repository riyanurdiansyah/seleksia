const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateRBAC() {
    try {
        console.log("Starting RBAC migration...");

        // 1. Fetch all admin mappings
        const adminMappings = await prisma.roleMenuAccess.findMany({
            where: { role: 'admin' }
        });

        console.log(`Found ${adminMappings.length} admin mappings.`);

        const superAdminMappings = [];

        for (const mapping of adminMappings) {
            // For superadmin, copy the admin's exact permissions
            superAdminMappings.push({
                role: 'superadmin',
                menuId: mapping.menuId,
                canRead: mapping.canRead,
                canCreate: mapping.canCreate,
                canUpdate: mapping.canUpdate,
                canDelete: mapping.canDelete,
            });
        }

        // Insert superadmin permissions
        if (superAdminMappings.length > 0) {
            await prisma.roleMenuAccess.createMany({
                data: superAdminMappings,
                skipDuplicates: true
            });
            console.log(`Created ${superAdminMappings.length} superadmin mappings.`);
        }

        // Update admin to be read-only for the ones they had access to
        await prisma.roleMenuAccess.updateMany({
            where: { role: 'admin' },
            data: {
                canCreate: false,
                canUpdate: false,
                canDelete: false,
            }
        });

        console.log("Updated admin mappings to read-only.");
        console.log("Migration complete!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

migrateRBAC();
