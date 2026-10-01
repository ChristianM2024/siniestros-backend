-- AlterTable
ALTER TABLE "siniestros" ADD COLUMN     "marca_modelo_tercero" TEXT,
ADD COLUMN     "nombre_tercero_causante" TEXT,
ADD COLUMN     "placa_tercero" TEXT,
ADD COLUMN     "tercero_afecto_poliza" BOOLEAN;
