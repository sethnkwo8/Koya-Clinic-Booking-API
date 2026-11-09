import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse, isValidEmail, serializeBooking } from "@/lib/api";
import { hashBookingBody } from "@/lib/idempotency";
import { consumeBookingAttempt } from "@/lib/rate-limit";

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ created_at: createdAt.toISOString(), id }),
  ).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as { created_at: string; id: string };
    const createdAt = new Date(parsed.created_at);
    if (!parsed.id || Number.isNaN(createdAt.getTime())) {
      return null;
    }
    return { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const emailParam = request.nextUrl.searchParams.get("email");
  if (!emailParam?.trim()) {
    return errorResponse("email required", 400);
  }
  const email = emailParam.trim().toLowerCase();

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam === null ? 10 : Number.parseInt(limitParam, 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return errorResponse("invalid limit", 400);
  }

  const cursorParam = request.nextUrl.searchParams.get("cursor");
  let cursorFilter: Prisma.BookingWhereInput | undefined;

  if (cursorParam) {
    const decoded = decodeCursor(cursorParam);
    if (!decoded) {
      return errorResponse("invalid cursor", 400);
    }
    cursorFilter = {
      OR: [
        { createdAt: { gt: decoded.createdAt } },
        {
          createdAt: decoded.createdAt,
          id: { gt: decoded.id },
        },
      ],
    };
  }

  const rows = await prisma.booking.findMany({
    where: {
      email,
      ...cursorFilter,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const bookings = hasMore ? rows.slice(0, limit) : rows;
  const last = bookings[bookings.length - 1];

  return NextResponse.json({
    bookings: bookings.map(serializeBooking),
    next_cursor:
      hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
  });
}

type NormalizedBody = { slot_id: string; name: string; email: string };

function normalizeBody(raw: unknown):
  | { ok: true; body: NormalizedBody }
  | { ok: false; response: NextResponse } {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      response: errorResponse("invalid body", 400),
    };
  }

  const slot_id =
    typeof (raw as { slot_id?: unknown }).slot_id === "string"
      ? (raw as { slot_id: string }).slot_id.trim()
      : "";
  const name =
    typeof (raw as { name?: unknown }).name === "string"
      ? (raw as { name: string }).name.trim()
      : "";
  const email =
    typeof (raw as { email?: unknown }).email === "string"
      ? (raw as { email: string }).email.trim().toLowerCase()
      : "";

  if (!slot_id || !name || !email) {
    return {
      ok: false,
      response: errorResponse("missing or invalid field", 400),
    };
  }

  if (!isValidEmail(email)) {
    return {
      ok: false,
      response: errorResponse("invalid email", 400),
    };
  }

  return { ok: true, body: { slot_id, name, email } };
}

async function saveIdempotency(
  key: string,
  bodyHash: string,
  statusCode: number,
  responseBody: object,
) {
  await prisma.idempotencyRecord.upsert({
    where: { key },
    create: {
      key,
      bodyHash,
      statusCode,
      responseBody: JSON.stringify(responseBody),
    },
    update: {},
  });
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse("invalid json", 400);
  }

  const normalized = normalizeBody(raw);
  if (!normalized.ok) {
    return normalized.response;
  }
  const body = normalized.body;

  const rate = await consumeBookingAttempt(body.email);
  if (!rate.allowed) {
    return errorResponse("too many requests", 429, {
      "Retry-After": String(rate.retryAfter),
    });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  const bodyHash = hashBookingBody(body);

  if (idempotencyKey) {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    });
    if (existing) {
      if (existing.bodyHash !== bodyHash) {
        return errorResponse("idempotency key reused", 422);
      }
      const payload = JSON.parse(existing.responseBody) as object;
      return NextResponse.json(payload, { status: existing.statusCode });
    }
  }

  const slot = await prisma.slot.findUnique({ where: { id: body.slot_id } });
  if (!slot) {
    const resp = { error: "slot not found" };
    if (idempotencyKey) {
      await saveIdempotency(idempotencyKey, bodyHash, 404, resp);
    }
    return NextResponse.json(resp, { status: 404 });
  }

  const now = new Date();
  if (slot.start <= now) {
    const resp = { error: "slot has already started" };
    if (idempotencyKey) {
      await saveIdempotency(idempotencyKey, bodyHash, 400, resp);
    }
    return NextResponse.json(resp, { status: 400 });
  }

  const confirmed = await prisma.booking.findFirst({
    where: { slotId: body.slot_id, status: "confirmed" },
  });
  if (confirmed) {
    const resp = { error: "slot already booked" };
    if (idempotencyKey) {
      await saveIdempotency(idempotencyKey, bodyHash, 409, resp);
    }
    return NextResponse.json(resp, { status: 409 });
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        id: randomUUID(),
        slotId: body.slot_id,
        name: body.name,
        email: body.email,
        status: "confirmed",
      },
    });
    const payload = serializeBooking(booking);
    if (idempotencyKey) {
      await saveIdempotency(idempotencyKey, bodyHash, 201, payload);
    }
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const resp = { error: "slot already booked" };
      if (idempotencyKey) {
        await saveIdempotency(idempotencyKey, bodyHash, 409, resp);
      }
      return NextResponse.json(resp, { status: 409 });
    }
    throw err;
  }
}
