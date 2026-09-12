// Script de una sola vez para renombrar los siniestros que quedaron con el
// formato viejo (SIN-AAAA-NNN) al formato nuevo (SIN-NNN).
//
// Este archivo asume que vive en backend/src/config/, junto a prisma.ts.
// Cómo correrlo (parado en esa carpeta, backend/src/config/):
//   npx tsx migrar-numeros-siniestro.ts

import { prisma } from './prisma';

async function main() {
  const cambios = [
    { antiguo: 'SIN-2026-001', nuevo: 'SIN-001' },
    { antiguo: 'SIN-2026-002', nuevo: 'SIN-002' },
  ];

  for (const { antiguo, nuevo } of cambios) {
    const resultado = await prisma.siniestro.updateMany({
      where: { noSiniestro: antiguo },
      data: { noSiniestro: nuevo },
    });
    console.log(`${antiguo} -> ${nuevo}: ${resultado.count} registro(s) actualizado(s)`);
  }
}

main()
  .then(() => {
    console.log('Migración completa.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en la migración:', err);
    process.exit(1);
  });