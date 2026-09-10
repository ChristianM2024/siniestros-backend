-- AlterTable
ALTER TABLE "vehiculos" ADD COLUMN     "administrador_id" INTEGER,
ADD COLUMN     "blindaje" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clase_id" INTEGER,
ADD COLUMN     "fecha_fin_contrato" TIMESTAMP(3),
ADD COLUMN     "fecha_inicio_contrato" TIMESTAMP(3),
ADD COLUMN     "gama_id" INTEGER,
ADD COLUMN     "gerente_cuenta_id" INTEGER,
ADD COLUMN     "km_anual_contratado" INTEGER,
ADD COLUMN     "nivel_blindaje_id" INTEGER,
ADD COLUMN     "no_anexo" TEXT,
ADD COLUMN     "no_cotizacion" TEXT,
ADD COLUMN     "no_factura" TEXT,
ADD COLUMN     "proveedor_compra_id" INTEGER,
ADD COLUMN     "sustituto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipo_activo_id" INTEGER,
ADD COLUMN     "tipo_combustible_id" INTEGER,
ADD COLUMN     "tipo_operacion_id" INTEGER;

-- CreateTable
CREATE TABLE "administradores" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "administradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gerentes_cuenta" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "gerentes_cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_activo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "tipos_activo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_combustible" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "tipos_combustible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clases" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "clases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "clase_id" INTEGER NOT NULL,

    CONSTRAINT "gamas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores_compra" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "proveedores_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_operacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "tipos_operacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niveles_blindaje" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "niveles_blindaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "administradores_nombre_key" ON "administradores"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "gerentes_cuenta_nombre_key" ON "gerentes_cuenta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_activo_nombre_key" ON "tipos_activo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_combustible_nombre_key" ON "tipos_combustible"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "clases_nombre_key" ON "clases"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "gamas_clase_id_nombre_key" ON "gamas"("clase_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_compra_nombre_key" ON "proveedores_compra"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_operacion_nombre_key" ON "tipos_operacion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "niveles_blindaje_nombre_key" ON "niveles_blindaje"("nombre");

-- AddForeignKey
ALTER TABLE "gamas" ADD CONSTRAINT "gamas_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_administrador_id_fkey" FOREIGN KEY ("administrador_id") REFERENCES "administradores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_gerente_cuenta_id_fkey" FOREIGN KEY ("gerente_cuenta_id") REFERENCES "gerentes_cuenta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_tipo_activo_id_fkey" FOREIGN KEY ("tipo_activo_id") REFERENCES "tipos_activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_tipo_combustible_id_fkey" FOREIGN KEY ("tipo_combustible_id") REFERENCES "tipos_combustible"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_gama_id_fkey" FOREIGN KEY ("gama_id") REFERENCES "gamas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_proveedor_compra_id_fkey" FOREIGN KEY ("proveedor_compra_id") REFERENCES "proveedores_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_tipo_operacion_id_fkey" FOREIGN KEY ("tipo_operacion_id") REFERENCES "tipos_operacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_nivel_blindaje_id_fkey" FOREIGN KEY ("nivel_blindaje_id") REFERENCES "niveles_blindaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;
