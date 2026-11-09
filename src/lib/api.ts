import { NextResponse } from "next/server";
import type { Booking } from "@prisma/client";

export function errorResponse(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export function serializeBooking(booking: Booking) {
  return {
    id: booking.id,
    slot_id: booking.slotId,
    name: booking.name,
    email: booking.email,
    status: booking.status,
    created_at: booking.createdAt.toISOString(),
  };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
