/*
  Warnings:

  - You are about to drop the column `estado` on the `siniestros` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "siniestros_estado_idx";

-- AlterTable
ALTER TABLE "siniestros" DROP COLUMN "estado",
ADD COLUMN     "estatus_cobro_cliente_id" INTEGER,
ADD COLUMN     "estatus_siniestro_id" INTEGER,
ADD COLUMN     "movilizado_grua" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "punto_atencion_taller_id" INTEGER,
ADD COLUMN     "taller_ciudad_id" INTEGER,
ADD COLUMN     "tiene_cotizacion" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "EstadoSiniestro";

-- CreateTable
CREATE TABLE "talleres" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "talleres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taller_ciudades" (
    "id" SERIAL NOT NULL,
    "taller_id" INTEGER NOT NULL,
    "ciudad_id" INTEGER NOT NULL,

    CONSTRAINT "taller_ciudades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puntos_atencion_taller" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "taller_ciudad_id" INTEGER NOT NULL,

    CONSTRAINT "puntos_atencion_taller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estatus_cobro_cliente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "estatus_cobro_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estatus_siniestro" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo_siniestro_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "estatus_siniestro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "talleres_nombre_key" ON "talleres"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "taller_ciudades_taller_id_ciudad_id_key" ON "taller_ciudades"("taller_id", "ciudad_id");

-- CreateIndex
CREATE UNIQUE INDEX "puntos_atencion_taller_taller_ciudad_id_nombre_key" ON "puntos_atencion_taller"("taller_ciudad_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "estatus_cobro_cliente_nombre_key" ON "estatus_cobro_cliente"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "estatus_siniestro_tipo_siniestro_id_nombre_key" ON "estatus_siniestro"("tipo_siniestro_id", "nombre");

-- CreateIndex
CREATE INDEX "siniestros_estatus_siniestro_id_idx" ON "siniestros"("estatus_siniestro_id");

-- AddForeignKey
ALTER TABLE "taller_ciudades" ADD CONSTRAINT "taller_ciudades_taller_id_fkey" FOREIGN KEY ("taller_id") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taller_ciudades" ADD CONSTRAINT "taller_ciudades_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "ciudades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puntos_atencion_taller" ADD CONSTRAINT "puntos_atencion_taller_taller_ciudad_id_fkey" FOREIGN KEY ("taller_ciudad_id") REFERENCES "taller_ciudades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estatus_siniestro" ADD CONSTRAINT "estatus_siniestro_tipo_siniestro_id_fkey" FOREIGN KEY ("tipo_siniestro_id") REFERENCES "tipos_siniestro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_estatus_siniestro_id_fkey" FOREIGN KEY ("estatus_siniestro_id") REFERENCES "estatus_siniestro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_estatus_cobro_cliente_id_fkey" FOREIGN KEY ("estatus_cobro_cliente_id") REFERENCES "estatus_cobro_cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_taller_ciudad_id_fkey" FOREIGN KEY ("taller_ciudad_id") REFERENCES "taller_ciudades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_punto_atencion_taller_id_fkey" FOREIGN KEY ("punto_atencion_taller_id") REFERENCES "puntos_atencion_taller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
