import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const vehiculos = await prisma.vehiculo.findMany({ select: { id: true, cliente: true } });
  const nombresUnicos = [...new Set(vehiculos.map(v => v.cliente.trim()))];

  console.log(`Encontrados ${nombresUnicos.length} clientes únicos en ${vehiculos.length} vehículos.`);

  for (const nombre of nombresUnicos) {
    const cliente = await prisma.cliente.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });

    const vehiculosDeEsteCliente = vehiculos.filter(v => v.cliente.trim() === nombre);
    await prisma.vehiculo.updateMany({
      where: { id: { in: vehiculosDeEsteCliente.map(v => v.id) } },
      data: { clienteId: cliente.id },
    });

    console.log(`✓ ${nombre} → ${vehiculosDeEsteCliente.length} vehículo(s)`);
  }

  const sinAsignar = await prisma.vehiculo.count({ where: { clienteId: null } });
  console.log(sinAsignar === 0 ? '✅ Todos los vehículos migrados.' : `⚠️ ${sinAsignar} vehículos sin clienteId, revisa antes de continuar.`);
}

main().finally(() => prisma.$disconnect());