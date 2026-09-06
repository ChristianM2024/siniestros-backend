-- CreateEnum
CREATE TYPE "OrigenSiniestro" AS ENUM ('INTERNO', 'PUBLICO');

-- DropForeignKey
ALTER TABLE "siniestros" DROP CONSTRAINT "siniestros_creado_por_id_fkey";

-- AlterTable
ALTER TABLE "siniestro_historial" ALTER COLUMN "usuario_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "siniestros" ADD COLUMN     "correo_conductor" TEXT,
ADD COLUMN     "origen" "OrigenSiniestro" NOT NULL DEFAULT 'INTERNO',
ALTER COLUMN "creado_por_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "solicitudes_formulario" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "vehiculo_id" INTEGER NOT NULL,
    "enviado_por_id" INTEGER NOT NULL,
    "correo_cliente" TEXT,
    "telefono_cliente" TEXT,
    "canal" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ENVIADO',
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siniestro_id" INTEGER,

    CONSTRAINT "solicitudes_formulario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_formulario_token_key" ON "solicitudes_formulario"("token");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_formulario_siniestro_id_key" ON "solicitudes_formulario"("siniestro_id");

-- CreateIndex
CREATE INDEX "solicitudes_formulario_estado_idx" ON "solicitudes_formulario"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_formulario_vehiculo_id_idx" ON "solicitudes_formulario"("vehiculo_id");

-- CreateIndex
CREATE INDEX "siniestros_origen_idx" ON "siniestros"("origen");

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestro_historial" ADD CONSTRAINT "siniestro_historial_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_formulario" ADD CONSTRAINT "solicitudes_formulario_siniestro_id_fkey" FOREIGN KEY ("siniestro_id") REFERENCES "siniestros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_formulario" ADD CONSTRAINT "solicitudes_formulario_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_formulario" ADD CONSTRAINT "solicitudes_formulario_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
