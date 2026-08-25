-- CreateEnum
CREATE TYPE "EstadoSiniestro" AS ENUM ('Reportado', 'En Peritaje', 'En Reparacion', 'Entregado', 'Cerrado');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pantallas" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "icono" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pantallas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_pantalla" (
    "id" SERIAL NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "pantalla_id" INTEGER NOT NULL,
    "puede_ver" BOOLEAN NOT NULL DEFAULT true,
    "puede_crear" BOOLEAN NOT NULL DEFAULT false,
    "puede_editar" BOOLEAN NOT NULL DEFAULT false,
    "puede_eliminar" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rol_pantalla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciudades" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "ciudades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aseguradoras" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "aseguradoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehiculos" (
    "id" SERIAL NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "anio" INTEGER,
    "color" TEXT,
    "chasis" TEXT,
    "no_motor" TEXT,
    "cliente" TEXT NOT NULL,
    "no_contrato" TEXT,
    "ciudad_id" INTEGER,
    "aseguradora_id" INTEGER,
    "no_poliza" TEXT,
    "vencimiento_poliza" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siniestros" (
    "id" SERIAL NOT NULL,
    "no_siniestro" TEXT NOT NULL,
    "vehiculo_id" INTEGER NOT NULL,
    "fecha_siniestro" TIMESTAMP(3) NOT NULL,
    "conductor" TEXT NOT NULL,
    "tel_conductor" TEXT,
    "lugar_accidente" TEXT NOT NULL,
    "ciudad_id" INTEGER,
    "descripcion" TEXT,
    "danos_vehiculo" TEXT,
    "danos_terceros" TEXT,
    "intervino_policia" BOOLEAN NOT NULL DEFAULT false,
    "heridos" BOOLEAN NOT NULL DEFAULT false,
    "fecha_notif_aseg" TIMESTAMP(3),
    "fecha_ingreso_taller" TIMESTAMP(3),
    "fecha_proforma" TIMESTAMP(3),
    "fecha_autorizacion" TIMESTAMP(3),
    "fecha_entrega" TIMESTAMP(3),
    "estado" "EstadoSiniestro" NOT NULL DEFAULT 'Reportado',
    "notas" TEXT,
    "creado_por_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siniestros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siniestro_documentos" (
    "id" SERIAL NOT NULL,
    "siniestro_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "subido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "siniestro_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siniestro_historial" (
    "id" SERIAL NOT NULL,
    "siniestro_id" INTEGER NOT NULL,
    "estado_anterior" TEXT,
    "estado_nuevo" TEXT NOT NULL,
    "nota" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "siniestro_historial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "pantallas_codigo_key" ON "pantallas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "rol_pantalla_rol_id_pantalla_id_key" ON "rol_pantalla"("rol_id", "pantalla_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ciudades_nombre_key" ON "ciudades"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "aseguradoras_nombre_key" ON "aseguradoras"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "vehiculos_placa_key" ON "vehiculos"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "siniestros_no_siniestro_key" ON "siniestros"("no_siniestro");

-- CreateIndex
CREATE INDEX "siniestros_estado_idx" ON "siniestros"("estado");

-- CreateIndex
CREATE INDEX "siniestros_vehiculo_id_idx" ON "siniestros"("vehiculo_id");

-- AddForeignKey
ALTER TABLE "rol_pantalla" ADD CONSTRAINT "rol_pantalla_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_pantalla" ADD CONSTRAINT "rol_pantalla_pantalla_id_fkey" FOREIGN KEY ("pantalla_id") REFERENCES "pantallas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "ciudades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_aseguradora_id_fkey" FOREIGN KEY ("aseguradora_id") REFERENCES "aseguradoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "ciudades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestro_documentos" ADD CONSTRAINT "siniestro_documentos_siniestro_id_fkey" FOREIGN KEY ("siniestro_id") REFERENCES "siniestros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestro_historial" ADD CONSTRAINT "siniestro_historial_siniestro_id_fkey" FOREIGN KEY ("siniestro_id") REFERENCES "siniestros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
