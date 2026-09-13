-- AlterTable
ALTER TABLE "vehiculos" ADD COLUMN     "ram" TEXT,
ADD COLUMN     "transmisionId" INTEGER;

-- CreateTable
CREATE TABLE "transmisiones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "transmisiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transmisiones_nombre_key" ON "transmisiones"("nombre");

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_transmisionId_fkey" FOREIGN KEY ("transmisionId") REFERENCES "transmisiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
