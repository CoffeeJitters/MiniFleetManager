# MiniFleet Manager

A lightweight SaaS platform that helps owners of small commercial fleets (< 20 vehicles) schedule preventive maintenance, track service history, and send automated SMS/email reminders to drivers.

## Features

- **Vehicle Management**: Add, edit, and track vehicles in your fleet
- **Maintenance Templates**: Use built-in templates or create custom maintenance schedules
- **Automated Reminders**: Get email/SMS reminders for upcoming and overdue services
- **Service History**: Track all maintenance and repairs in one place
- **Calendar Integration**: Export maintenance schedules to calendar apps
- **Multi-tenant**: Each company's data is completely isolated
- **Role-based Access**: Owner, Manager, and Driver roles with appropriate permissions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Environment variables configured (see `.env.example`)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure:
   - `DATABASE_URL`: Your PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/minifleet?schema=public`)
   - `NEXTAUTH_SECRET`: A random secret for session encryption
   - `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000`)

4. Set up the database:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── vehicles/          # Vehicle management
│   ├── maintenance/       # Maintenance features
│   └── ...
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── vehicles/         # Vehicle-related components
│   └── maintenance/      # Maintenance-related components
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── middleware.ts     # Auth and RBAC helpers
│   └── reminders.ts     # Reminder system logic
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Prisma schema
│   └── seed.ts          # Database seed script
└── types/                # TypeScript type definitions
```

## Key Features Implementation

### Multi-tenant Architecture

All data is scoped by `companyId`. Every query includes company filtering to ensure data isolation.

### Role-based Access Control

- **Owner**: Full access, can manage company settings
- **Manager**: Can manage vehicles and maintenance, cannot change company settings
- **Driver**: Read-only access to assigned vehicles

### Reminder System

The reminder system scans maintenance schedules and creates reminders for:
- Services due in the next 7 days
- Overdue services

Reminders are created as records in the database and can be processed to send emails/SMS. In development, reminders are logged to the console. In production, integrate with:
- Email: SendGrid, AWS SES, etc.
- SMS: Twilio, etc.

To manually trigger reminder scans:
1. Navigate to `/admin/reminders`
2. Click "Scan for Reminders" to create reminder records
3. Click "Process Pending Reminders" to send them (stub in dev)

### Calendar Integration

Maintenance schedules can be exported as ICS files for import into Google Calendar, Outlook, etc. Click "Add to Calendar" on any upcoming service.

## Fleet Size Limit

The MVP enforces a limit of 20 vehicles per company. This is checked in the UI and backend API.

## Development Notes

- Email/SMS reminders are stubbed for development. Check console logs to see what would be sent.
- Billing is stubbed with a "Trial" plan. No payment integration yet.
- The reminder system is designed to run as a cron job or background worker in production.

## Database Schema

Key entities:
- `Company`: Multi-tenant isolation
- `User`: Authentication and authorization
- `Vehicle`: Fleet vehicles
- `MaintenanceTemplate`: Service templates (built-in or custom)
- `MaintenanceSchedule`: Links vehicles to templates with due dates
- `ServiceEvent`: Logged service records
- `Reminder`: Email/SMS reminder records

## License

MIT


