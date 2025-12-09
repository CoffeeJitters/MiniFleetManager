# Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/minifleet?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-random-secret-here"
   ```

   Generate a random secret for `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

3. **Set up PostgreSQL database:**
   - Create a new database named `minifleet` (or your preferred name)
   - Update `DATABASE_URL` in `.env` with your connection string

4. **Initialize the database:**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

   This will:
   - Create all database tables
   - Seed built-in maintenance templates (Oil Change, Tire Rotation, etc.)

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## First Steps After Setup

1. **Create an account:**
   - Click "Start Free Trial" on the homepage
   - Enter your company name, name, email, and password
   - You'll be automatically assigned the "Owner" role

2. **Add your first vehicle:**
   - After login, you'll see the dashboard
   - Click "Add Your First Vehicle"
   - Fill in vehicle details (make, model, year, VIN, etc.)

3. **Create a maintenance schedule:**
   - Go to the vehicle detail page
   - Click "Schedule Maintenance"
   - Select a maintenance template (e.g., "Oil Change")
   - Set the last service date and odometer

4. **Test reminders:**
   - Navigate to `/admin/reminders`
   - Click "Scan for Reminders" to create reminder records
   - Check the console for email/SMS stub output

## Testing the Reminder System

The reminder system is designed to run automatically via cron jobs in production. For development/testing:

1. Create some maintenance schedules with due dates in the past or near future
2. Go to `/admin/reminders`
3. Click "Scan for Reminders" - this creates reminder records
4. Click "Process Pending Reminders" - this sends them (stub in dev, logs to console)

## Calendar Integration

To test calendar export:
1. Create a maintenance schedule with an upcoming due date
2. Go to `/calendar`
3. Click "Add to Calendar" on any service
4. The ICS file will download and can be imported into Google Calendar, Outlook, etc.

## Production Deployment

For production:

1. **Set up a production database** (e.g., PostgreSQL on AWS RDS, Supabase, etc.)

2. **Configure environment variables:**
   - Set `NEXTAUTH_URL` to your production domain
   - Generate a secure `NEXTAUTH_SECRET`
   - Configure email/SMS providers:
     - Email: Set up SMTP or use a service like SendGrid
     - SMS: Configure Twilio credentials

3. **Set up reminder processing:**
   - Option 1: Use a cron job service (e.g., Vercel Cron, GitHub Actions)
   - Option 2: Use a background job queue (e.g., Bull, BullMQ)
   - Call `/api/admin/reminders/scan` periodically (e.g., daily)

4. **Deploy:**
   - Deploy to Vercel, Railway, or your preferred platform
   - Run database migrations: `npx prisma migrate deploy`

## Troubleshooting

**Database connection errors:**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database credentials

**Authentication issues:**
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your app URL

**Reminder system not working:**
- Check that maintenance schedules have `nextDueDate` set
- Verify reminder scan endpoint is accessible
- Check console logs for errors

