-- AlterTable
ALTER TABLE "siniestros" ADD COLUMN     "categoria_licencia" TEXT,
ADD COLUMN     "cedula_conductor" TEXT,
ADD COLUMN     "licencia_conductor" TEXT,
ADD COLUMN     "vencimiento_licencia" TIMESTAMP(3);
