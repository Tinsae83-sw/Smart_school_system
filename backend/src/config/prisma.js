const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Load environment variables
require("dotenv").config();

// Create PostgreSQL connection pool optimised for Neon serverless.
// Neon has a cold-start latency of 3-7 s; all timeouts must be larger than that.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                        // Neon free tier: keep connections low to avoid exhaustion
  min: 0,                         // Allow pool to drain when idle (Neon scales to zero)
  idleTimeoutMillis: 10000,       // Release idle clients quickly
  connectionTimeoutMillis: 30000, // Up to 30 s to establish a connection (covers cold start)
  statement_timeout: 60000,       // 60 s per statement – cold start + query must fit here
  query_timeout: 60000,           // 60 s pool-level query timeout
});

// Create adapter with pool
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'minimal',
});

// Don't auto-connect - let the application handle connection when needed
// Prisma will connect lazily on first query

// Handle disconnection errors
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.log(`⚠️ Slow query: ${e.query} took ${e.duration}ms`);
  }
});

module.exports = prisma;
