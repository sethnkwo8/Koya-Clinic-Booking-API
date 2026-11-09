import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";

type SlotInput = {
  id: string;
  provider: string;
  start: string;
  end: string;
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid json", 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("slots" in body) ||
    !Array.isArray((body as { slots: unknown }).slots)
  ) {
    return errorResponse("slots required", 400);
  }

  const slots = (body as { slots: SlotInput[] }).slots;

  for (const slot of slots) {
    if (
      !slot?.id ||
      !slot?.provider ||
      !slot?.start ||
      !slot?.end ||
      Number.isNaN(Date.parse(slot.start)) ||
      Number.isNaN(Date.parse(slot.end))
    ) {
      return errorResponse("invalid slot", 400);
    }
  }

  await prisma.$transaction([
    prisma.booking.deleteMany(),
    prisma.slot.deleteMany(),
    prisma.slot.createMany({
      data: slots.map((s) => ({
        id: s.id,
        provider: s.provider,
        start: new Date(s.start),
        end: new Date(s.end),
      })),
    }),
  ]);

  return new NextResponse(null, { status: 200 });
}
