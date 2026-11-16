# Deployment Guide - Vercel (Frontend) & Render (Backend)

## Overview
This guide will help you deploy the Smart School System:
- **Frontend (Next.js)** → Vercel
- **Backend (Node.js/Express)** → Render

---

## Prerequisites
- GitHub account with the project pushed to a repository
- Vercel account (free tier available)
- Render account (free tier available)
- PostgreSQL database (can use Render PostgreSQL or external)

---

## Step 1: Deploy Backend to Render

### 1.1 Prepare Backend
```bash
cd backend
```

### 1.2 Create Render Configuration
The `render.yaml` file is already created in the backend folder.

### 1.3 Deploy via Render Dashboard

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `smart-school-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`

5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `DATABASE_URL` = Your PostgreSQL connection string
   - `JWT_SECRET` = Generate a secure random string
   - `CORS_ORIGIN` = Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)

6. Click **"Create Web Service"**

### 1.4 Initialize the Database
The backend runs `npx prisma db push` before starting, so the schema is synchronized during deployment. To initialize sample data:

1. Go to your Render dashboard → PostgreSQL database
2. Copy the **Internal Database URL**
3. SSH into your web service or use Render Shell:
   ```bash
   node seed.js
   ```

### 1.5 Note Your Backend URL
After deployment, Render will provide a URL like:
```
https://smart-school-backend.onrender.com
```
Copy this for the frontend configuration.

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Prepare Frontend
```bash
cd frontend
```

### 2.2 Configure Environment Variables

Create `.env.production` in the frontend folder:
```bash
NEXT_PUBLIC_API_BASE=https://smart-school-backend.onrender.com/api
```

Replace with your actual Render backend URL.

### 2.3 Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. Add Environment Variables:
   - `NEXT_PUBLIC_API_BASE` = Your Render backend URL
     - Example: `https://smart-school-backend.onrender.com/api`

6. Click **"Deploy"**

### 2.4 Note Your Frontend URL
After deployment, Vercel will provide a URL like:
```
https://your-app-name.vercel.app
```

---

## Step 3: Update CORS Configuration

Update the backend's CORS origin to allow your Vercel frontend:

In `backend/src/server.js`, update:
```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://your-app-name.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```

Then redeploy the backend on Render.

---

## Step 4: Database Setup (Render PostgreSQL)

### Option A: Use Render PostgreSQL (Recommended)

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Choose a name: `smart-school-db`
3. Select the free tier
4. Create the database
5. Copy the **Internal Database URL** to your backend environment variables

### Option B: Use External Database (Neon, Supabase, etc.)

1. Create a PostgreSQL database with your preferred provider
2. Copy the connection string
3. Add it as `DATABASE_URL` in Render backend environment variables

---

## Step 5: Seed Database with Initial Data

After backend deployment and database setup:

1. Access your Render web service
2. Open a shell/SSH
3. Run:
   ```bash
   npx prisma db push
   node seed.js
   ```

This will create the database schema and populate it with sample data.

---

## Environment Variables Summary

### Backend (Render)
```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://your-app.vercel.app
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_BASE=https://smart-school-backend.onrender.com/api
```

---

## Troubleshooting

### Backend Issues
- **Database Connection Error**: Verify `DATABASE_URL` is correct
- **Database schema sync failed**: Check the Render service logs and verify `DATABASE_URL` and database permissions. The backend runs `npx prisma db push` before starting.
- **Port Issues**: Ensure PORT is set to 10000 (Render's default)

### Frontend Issues
- **API Calls Failing**: Check `NEXT_PUBLIC_API_BASE` is correct
- **CORS Errors**: Update backend CORS to include your Vercel domain
- **Build Failures**: Ensure all dependencies are in `package.json`

### Common Issues
1. **Cannot Connect to Backend**
   - Check backend is running on Render
   - Verify CORS origin includes your Vercel domain
   - Check API URL in frontend env variables

2. **Database Not Seeded**
   - Access Render Shell for your backend
   - Run `npx prisma db push` then `node seed.js`

3. **Authentication Fails**
   - Verify JWT_SECRET is set in backend
   - Check token is being sent correctly from frontend

---

## Login Credentials (After Seeding)

Use these credentials to log in after deployment:

**Password for all accounts:** `Password123!`

- **Finance Officer**: `finance@school.edu`
- **Principal**: `principal@school.edu`
- **Teacher**: `jane.doe@school.edu`
- **Student**: `student@school.edu`
- **Parent**: `parent@school.edu`
- **Admin**: `admin@school.edu`

---

## Continuous Deployment

Both Vercel and Render support automatic deployments from GitHub:
- Push to `main` branch → Automatic deployment
- Pull requests → Preview deployments (Vercel)

---

## Cost Estimate

### Free Tier Limits

**Vercel (Frontend)**
- 100GB bandwidth/month
- 6,000 minutes of build time/month
- Unlimited projects

**Render (Backend)**
- 750 hours/month (enough for always-on)
- 100GB bandwidth/month
- Free PostgreSQL database (90 days sleep after inactivity)

### Potential Costs
- If you exceed free tier limits:
  - Vercel: ~$20/month for Pro plan
  - Render: ~$7/month for paid backend tier
  - PostgreSQL: ~$7/month for paid database tier

---

## Security Recommendations

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong `JWT_SECRET`
   - Rotate secrets periodically

2. **Database**
   - Use SSL connections
   - Restrict IP access if possible
   - Regular backups

3. **API Security**
   - Implement rate limiting
   - Add request validation
   - Use HTTPS only

---

## Monitoring

### Render Dashboard
- View logs
- Monitor CPU/memory usage
- Check deployment status

### Vercel Dashboard
- View analytics
- Monitor build times
- Check deployment logs

---

## Custom Domain (Optional)

### Vercel
1. Go to project settings → Domains
2. Add your custom domain
3. Update DNS records

### Render
1. Go to service settings → Domains
2. Add your custom domain
3. Update DNS records

---

## Support & Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

---

## Next Steps

1. Deploy backend to Render
2. Deploy frontend to Vercel
3. Set up PostgreSQL database
4. Run database migrations and seed
5. Test the application
6. Configure custom domains (optional)
7. Set up monitoring and alerts

---

## Quick Reference

**Backend URL**: `https://smart-school-backend.onrender.com`
**Frontend URL**: `https://your-app.vercel.app`
**Database**: Render PostgreSQL (or external)

**API Endpoints**:
- `/api/auth/login` - User login
- `/api/finance/budgets` - Get budgets
- `/api/finance/expenditures` - Get expenditures
- `/api/finance/income` - Get income transactions

---

## Questions?

If you encounter issues:
1. Check Render and Vercel logs
2. Verify environment variables
3. Ensure database is seeded
4. Check CORS configuration
5. Review this guide
