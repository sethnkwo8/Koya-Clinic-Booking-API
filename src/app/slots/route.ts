import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider") ?? undefined;

  const slots = await prisma.slot.findMany({
    where: provider ? { provider } : undefined,
    orderBy: { start: "asc" },
    include: {
      bookings: {
        where: { status: "confirmed" },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    slots: slots.map((slot) => ({
      id: slot.id,
      provider: slot.provider,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      available: slot.bookings.length === 0,
    })),
  });
}
