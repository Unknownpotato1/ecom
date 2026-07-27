import { PrismaClient } from '@prisma/client'

// Auto-fallback: if DATABASE_URL is missing or is the placeholder,
// use Vercel Postgres env vars if available.
// This lets the user create a Vercel Postgres store and redeploy —
// no manual env var copying needed.
if (
  process.env.POSTGRES_PRISMA_URL &&
  (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder'))
) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
