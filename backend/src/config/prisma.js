const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Load environment variables
require("dotenv").config();

// Create PostgreSQL connection pool with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  min: 5, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
  statement_timeout: 10000, // Abort any statement that takes more than 10 seconds
  query_timeout: 10000, // Abort any query that takes more than 10 seconds
});

// Create adapter with pool
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'minimal',
});

// Handle connection lifecycle
prisma.$connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch((err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });

// Handle disconnection errors
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.log(`⚠️ Slow query: ${e.query} took ${e.duration}ms`);
  }
});

// Graceful shutdown
const shutdown = async () => {
  console.log('👋 Shutting down database connection...');
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
};

process.on('beforeExit', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = prisma;