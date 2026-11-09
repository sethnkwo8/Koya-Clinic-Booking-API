import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, serializeBooking } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return errorResponse("booking not found", 404);
  }

  return NextResponse.json(serializeBooking(booking));
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return errorResponse("booking not found", 404);
  }

  if (booking.status === "cancelled") {
    return errorResponse("booking already cancelled", 409);
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return NextResponse.json(serializeBooking(updated));
}
