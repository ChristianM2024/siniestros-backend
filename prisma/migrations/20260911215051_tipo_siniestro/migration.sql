-- AlterTable
ALTER TABLE "siniestros" ADD COLUMN     "tipo_siniestro_id" INTEGER;

-- CreateTable
CREATE TABLE "tipos_siniestro" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_siniestro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_siniestro_codigo_key" ON "tipos_siniestro"("codigo");

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_tipo_siniestro_id_fkey" FOREIGN KEY ("tipo_siniestro_id") REFERENCES "tipos_siniestro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
