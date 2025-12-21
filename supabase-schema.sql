-- PostgreSQL Schema for MiniFleetManager
-- Generated from Prisma schema for Supabase
-- Paste this into Supabase SQL Editor

-- Create Enums
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'DRIVER');
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED');
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID');

-- Create Tables

-- Companies table
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "subscriptionPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- Users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'DRIVER',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Vehicles table
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vin" TEXT,
    "licensePlate" TEXT,
    "currentOdometer" INTEGER NOT NULL DEFAULT 0,
    "inServiceDate" TIMESTAMP(3),
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- Maintenance Templates table
CREATE TABLE "maintenance_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "intervalMonths" INTEGER,
    "intervalMiles" INTEGER,
    "checklistItems" TEXT[],
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_templates_pkey" PRIMARY KEY ("id")
);

-- Maintenance Schedules table
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "lastServiceDate" TIMESTAMP(3),
    "lastServiceOdometer" INTEGER,
    "nextDueDate" TIMESTAMP(3),
    "nextDueOdometer" INTEGER,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- Service Events table
CREATE TABLE "service_events" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "odometerAtService" INTEGER NOT NULL,
    "notes" TEXT,
    "checklistCompleted" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_events_pkey" PRIMARY KEY ("id")
);

-- Reminders table
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- Reminder Settings table
CREATE TABLE "reminder_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "channel" "ReminderChannel" NOT NULL DEFAULT 'EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_settings_pkey" PRIMARY KEY ("id")
);

-- Plans table
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "interval" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- Subscriptions table
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Junction table for many-to-many relationship between Users and Vehicles
CREATE TABLE "_VehicleDriver" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Create Unique Constraints
CREATE UNIQUE INDEX "companies_stripeCustomerId_key" ON "companies"("stripeCustomerId");
CREATE UNIQUE INDEX "companies_stripeSubscriptionId_key" ON "companies"("stripeSubscriptionId");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");
CREATE UNIQUE INDEX "maintenance_schedules_vehicleId_templateId_key" ON "maintenance_schedules"("vehicleId", "templateId");
CREATE UNIQUE INDEX "reminder_settings_companyId_key" ON "reminder_settings"("companyId");
CREATE UNIQUE INDEX "plans_stripePriceId_key" ON "plans"("stripePriceId");
CREATE UNIQUE INDEX "subscriptions_companyId_key" ON "subscriptions"("companyId");
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");
CREATE UNIQUE INDEX "_VehicleDriver_AB_unique" ON "_VehicleDriver"("A", "B");

-- Create Indexes for Foreign Keys
CREATE INDEX "_VehicleDriver_B_index" ON "_VehicleDriver"("B");

-- Create Foreign Key Constraints

-- Users foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vehicles foreign keys
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Maintenance Templates foreign keys
ALTER TABLE "maintenance_templates" ADD CONSTRAINT "maintenance_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Maintenance Schedules foreign keys
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "maintenance_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Service Events foreign keys
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "maintenance_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reminders foreign keys
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "maintenance_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reminder Settings foreign keys
ALTER TABLE "reminder_settings" ADD CONSTRAINT "reminder_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Subscriptions foreign keys
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Junction table foreign keys
ALTER TABLE "_VehicleDriver" ADD CONSTRAINT "_VehicleDriver_A_fkey" FOREIGN KEY ("A") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_VehicleDriver" ADD CONSTRAINT "_VehicleDriver_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updatedAt columns
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON "companies" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON "vehicles" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_templates_updated_at BEFORE UPDATE ON "maintenance_templates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_schedules_updated_at BEFORE UPDATE ON "maintenance_schedules" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_events_updated_at BEFORE UPDATE ON "service_events" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON "reminders" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reminder_settings_updated_at BEFORE UPDATE ON "reminder_settings" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON "plans" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON "subscriptions" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
