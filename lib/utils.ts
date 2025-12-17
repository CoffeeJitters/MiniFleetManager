import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { addMonths } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateNextDueDate(
  lastServiceDate: Date,
  intervalMonths: number | null,
  intervalMiles: number | null,
  lastServiceOdometer: number
): { nextDueDate: Date | null; nextDueOdometer: number | null } {
  let nextDueDate: Date | null = null
  let nextDueOdometer: number | null = null

  if (intervalMonths) {
    nextDueDate = addMonths(lastServiceDate, intervalMonths)
  }

  if (intervalMiles) {
    nextDueOdometer = lastServiceOdometer + intervalMiles
  }

  return { nextDueDate, nextDueOdometer }
}


