-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[];
