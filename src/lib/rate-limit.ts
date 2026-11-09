import { prisma } from "@/lib/prisma";

function minuteWindowStart(now: Date): Date {
  return new Date(Math.floor(now.getTime() / 60_000) * 60_000);
}

/** Max 5 booking attempts per email per minute (level 5); failed attempts count. */
export async function consumeBookingAttempt(
  email: string,
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const now = new Date();
  const windowStart = minuteWindowStart(now);

  const result = await prisma.$transaction(async (tx) => {
    const row = await tx.bookingAttempt.upsert({
      where: {
        email_windowStart: { email, windowStart },
      },
      create: { email, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    });

    if (row.count > 5) {
      const nextWindow = new Date(windowStart.getTime() + 60_000);
      const retryAfter = Math.max(
        1,
        Math.ceil((nextWindow.getTime() - now.getTime()) / 1000),
      );
      return { allowed: false as const, retryAfter };
    }

    return { allowed: true as const };
  });

  return result;
}
