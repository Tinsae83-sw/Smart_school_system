const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

// Load environment variables
require("dotenv").config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set in .env before starting the server.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

module.exports = prisma;