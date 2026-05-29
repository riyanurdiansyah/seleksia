/*
  Warnings:

  - Added the required column `companyId` to the `questions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'superadmin';

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "violations" ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "menus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_menu_access" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "menuId" TEXT NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canUpdate" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_menu_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_groups" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TestGroupTests" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TestGroupTests_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_menu_access_role_menuId_key" ON "role_menu_access"("role", "menuId");

-- CreateIndex
CREATE INDEX "_TestGroupTests_B_index" ON "_TestGroupTests"("B");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_menu_access" ADD CONSTRAINT "role_menu_access_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_groups" ADD CONSTRAINT "test_groups_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TestGroupTests" ADD CONSTRAINT "_TestGroupTests_A_fkey" FOREIGN KEY ("A") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TestGroupTests" ADD CONSTRAINT "_TestGroupTests_B_fkey" FOREIGN KEY ("B") REFERENCES "test_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
