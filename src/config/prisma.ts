import { PrismaClient } from '@prisma/client';

// Singleton para no abrir multiples conexiones en dev (hot reload)
export const prisma = new PrismaClient();
