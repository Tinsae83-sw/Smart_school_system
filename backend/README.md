# 🎓 Smart School Connect - Backend API

RESTful API for Smart School Connect system built with Express.js and Prisma ORM.

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── prisma.js              # Prisma client with PostgreSQL adapter
│   ├── controllers/
│   │   └── userController.js      # User registration & management logic
│   ├── middleware/
│   │   ├── errorHandler.js        # Error handling middleware
│   │   ├── index.js               # Middleware exports
│   │   └── validators.js          # Request validation
│   ├── routes/
│   │   └── userRoutes.js          # API route definitions
│   ├── utils/
│   │   └── helpers.js             # Utility functions
│   └── server.js                  # Express server setup
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── SCHEMA_UPDATE_GUIDE.md     # Schema documentation
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Environment template
└── package.json                   # Dependencies
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file based on `.env.example`:

```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=verify-full"
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BCRYPT_SALT_ROUNDS=10
```

### 3. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start at: **http://localhost:5000**

## 📋 API Endpoints

Base URL: `http://localhost:5000/api/admin/users`

- `POST /` - Register new user
- `POST /link-parent` - Link parent to student
- `GET /` - Get all users
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `PATCH /:id/status` - Toggle user status
- `POST /:id/reset-password` - Reset password
- `DELETE /:id` - Delete user

## 🔐 Security Features

- Password hashing with bcrypt
- Input validation
- CORS protection
- Error handling
- Transaction rollback on errors

## 🛠️ Scripts

```bash
npm run dev          # Start development server
npm start            # Start production server
npm run db:push      # Push schema to database
npm run db:generate  # Generate Prisma Client
npm run db:studio    # Open Prisma Studio
```

## 📖 Documentation

- [prisma/SCHEMA_UPDATE_GUIDE.md](prisma/SCHEMA_UPDATE_GUIDE.md) - Database schema guide

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready
