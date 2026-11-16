# Smart School Management System

A comprehensive school management system built with Next.js (frontend) and Node.js/Express (backend).

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd smartschoolsystem
```

2. **Setup Backend**
```bash
cd backend
npm install
cp env.example .env
# Update .env with your database credentials
npx prisma generate
npx prisma db push
node seed.js
npm start
```

Backend will run on `http://localhost:5000`

3. **Setup Frontend**
```bash
cd frontend
npm install
cp env.example .env.local
# Update .env.local with NEXT_PUBLIC_API_BASE=http://localhost:5000/api
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📦 Deployment

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to:
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Render PostgreSQL or external

### Quick Deploy Summary

1. **Deploy Backend to Render**
   - Connect GitHub repository
   - Use `render.yaml` configuration
   - Set environment variables
   - Run `npx prisma db push` and `node seed.js` after deployment

2. **Deploy Frontend to Vercel**
   - Connect GitHub repository
   - Set `NEXT_PUBLIC_API_BASE` to your Render backend URL
   - Deploy

3. **Update CORS**
   - Add Vercel domain to backend CORS origins

## 🏗️ Project Structure

```
smartschoolsystem/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth & validation
│   │   ├── routes/         # API routes
│   │   └── server.js       # Express server
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── seed.js             # Database seeding
│   └── render.yaml         # Render deployment config
├── frontend/               # Next.js Application
│   ├── src/
│   │   ├── app/           # Next.js app directory
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── lib/           # Utilities & API
│   │   └── translations/  # i18n translations
│   ├── vercel.json        # Vercel deployment config
│   └── env.example        # Environment variables example
└── DEPLOYMENT.md          # Detailed deployment guide
```

## 🔐 Default Credentials

After running `node seed.js`, use these credentials:

**Password**: `Password123!`

- **Admin**: `admin@school.edu`
- **Registrar**: `registration@school.edu`
- **Finance Officer**: `finance@school.edu`
- **Principal**: `principal@school.edu`
- **Teacher**: `jane.doe@school.edu`
- **Student**: `student@school.edu`
- **Parent**: `parent@school.edu`

## 📋 Features

### User Roles
- Super Admin
- Principal
- VP Academic
- VP Administration
- Department Head
- Teacher
- Student
- Parent
- Finance Officer
- PTSA Representative
- SIC Member

### Key Modules
- **Academic Management**: Classes, subjects, schedules
- **Attendance Tracking**: Student and staff attendance
- **Grade Management**: Assignments, exams, transcripts
- **Financial Management**: Budgets, income, expenditures
- **Staff Management**: Teacher and staff records
- **Communication**: Messages, announcements
- **Governance**: PTSA, SIC meetings
- **Reports**: Analytics and reporting

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Charts**: Recharts
- **Real-time**: Socket.io Client

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Real-time**: Socket.io
- **File Upload**: Multer

## 📝 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE=http://localhost:5000/api
```

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm run lint
```

## 📊 Database Schema

The database uses Prisma ORM with PostgreSQL. Key models include:
- Users (with role-specific extensions)
- Students, Teachers, Parents
- Classes, Subjects, Schedules
- Attendance, Grades, Assignments
- Budgets, Expenditures, Income
- Messages, Notifications
- And many more...

See `backend/prisma/schema.prisma` for complete schema.

## 🔧 Development Commands

### Backend
```bash
npm start          # Start server
npm run dev        # Start with nodemon
npm run seed       # Seed database
npx prisma studio  # Open Prisma Studio
npx prisma db push # Push schema to database
```

### Frontend
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Finance
- `GET /api/finance/budgets` - Get all budgets
- `GET /api/finance/expenditures` - Get expenditures
- `POST /api/finance/expenditures` - Create expenditure
- `GET /api/finance/income` - Get income transactions
- `POST /api/finance/income` - Create income record

### Principal
- `GET /api/principal/staff` - Get staff list
- `POST /api/principal/staff/register` - Register staff
- `GET /api/principal/departments` - Get departments

### Teacher
- `GET /api/teacher/classes` - Get teacher's classes
- `POST /api/teacher/attendance` - Mark attendance
- `POST /api/teacher/grades` - Submit grades

### Student
- `GET /api/student/profile` - Get student profile
- `GET /api/student/grades` - Get student grades
- `GET /api/student/attendance` - Get attendance record

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For questions or issues:
- Check the documentation
- Review environment variables
- Check database connection
- Verify API endpoints

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Parent portal enhancements
- [ ] Multi-language support
- [ ] Payment gateway integration
- [ ] Video conferencing integration
- [ ] AI-powered recommendations

---

**Built with ❤️ for Yekatit 25/67 Secondary School**
