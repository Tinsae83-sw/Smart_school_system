-- CreateEnum
CREATE TYPE "DegreeLevel" AS ENUM ('BACHELOR', 'MASTER', 'PHD', 'DIPLOMA', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "address" TEXT,
ADD COLUMN     "preferred_language" VARCHAR(20);

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "gender" VARCHAR(10);

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "degree_level" "DegreeLevel",
ADD COLUMN     "experience_years" INTEGER,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "grade_levels" INTEGER[],
ADD COLUMN     "hire_date" DATE,
ADD COLUMN     "subjects" TEXT[];
