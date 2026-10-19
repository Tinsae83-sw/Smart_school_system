const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Load environment variables
require("dotenv").config();

// Create PostgreSQL connection pool with optimized settings for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increased max connections for better performance
  min: 5, // Increased min connections to reduce connection overhead
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 20000, // Increased timeout for connection establishment
  statement_timeout: 30000, // 30s statement timeout
  query_timeout: 30000, // 30s query timeout
  // Add connection retry settings
  retryConnection: true,
  retryDelay: 2000,
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