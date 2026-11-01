const dotenv = require('dotenv')
const path = require('path')

// Load .env file from the backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

module.exports = {
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
}
