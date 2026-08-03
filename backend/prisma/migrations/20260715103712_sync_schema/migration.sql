/*
  Warnings:

  - The values [ADMIN] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'PRINCIPAL', 'VP_ACADEMIC', 'VP_ADMINISTRATION', 'DEPARTMENT_HEAD', 'TEACHER', 'STUDENT', 'PARENT', 'PTSA_REPRESENTATIVE', 'SIC_MEMBER');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- CreateTable
CREATE TABLE "principals" (
    "principal_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "appointment_date" DATE,

    CONSTRAINT "principals_pkey" PRIMARY KEY ("principal_id")
);

-- CreateTable
CREATE TABLE "vp_academic" (
    "vp_academic_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "appointment_date" DATE,

    CONSTRAINT "vp_academic_pkey" PRIMARY KEY ("vp_academic_id")
);

-- CreateTable
CREATE TABLE "vp_administration" (
    "vp_admin_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "appointment_date" DATE,

    CONSTRAINT "vp_administration_pkey" PRIMARY KEY ("vp_admin_id")
);

-- CreateTable
CREATE TABLE "department_heads" (
    "dept_head_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "appointment_date" DATE,

    CONSTRAINT "department_heads_pkey" PRIMARY KEY ("dept_head_id")
);

-- CreateTable
CREATE TABLE "ptsa_representatives" (
    "ptsa_rep_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "term_start" DATE,
    "term_end" DATE,
    "position" VARCHAR(50),

    CONSTRAINT "ptsa_representatives_pkey" PRIMARY KEY ("ptsa_rep_id")
);

-- CreateTable
CREATE TABLE "sic_members" (
    "sic_member_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" VARCHAR(100),
    "term_start" DATE,
    "term_end" DATE,

    CONSTRAINT "sic_members_pkey" PRIMARY KEY ("sic_member_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "principals_user_id_key" ON "principals"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "principals_employee_id_key" ON "principals"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "vp_academic_user_id_key" ON "vp_academic"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vp_academic_employee_id_key" ON "vp_academic"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "vp_administration_user_id_key" ON "vp_administration"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vp_administration_employee_id_key" ON "vp_administration"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_heads_user_id_key" ON "department_heads"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_heads_employee_id_key" ON "department_heads"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "ptsa_representatives_user_id_key" ON "ptsa_representatives"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sic_members_user_id_key" ON "sic_members"("user_id");

-- AddForeignKey
ALTER TABLE "principals" ADD CONSTRAINT "principals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vp_academic" ADD CONSTRAINT "vp_academic_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vp_administration" ADD CONSTRAINT "vp_administration_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_heads" ADD CONSTRAINT "department_heads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_representatives" ADD CONSTRAINT "ptsa_representatives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sic_members" ADD CONSTRAINT "sic_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
