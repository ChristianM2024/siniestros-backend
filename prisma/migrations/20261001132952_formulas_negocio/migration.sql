-- AlterTable
ALTER TABLE "siniestros" ADD COLUMN     "cumple_kpi_6_horas" TEXT,
ADD COLUMN     "dias_taller" DOUBLE PRECISION,
ADD COLUMN     "fecha_hora_reclamo" TIMESTAMP(3),
ADD COLUMN     "numero_evento_cliente" INTEGER;
