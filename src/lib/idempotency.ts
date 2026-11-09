import { createHash } from "crypto";

export function hashBookingBody(body: {
  slot_id: string;
  name: string;
  email: string;
}): string {
  const canonical = JSON.stringify({
    slot_id: body.slot_id,
    name: body.name,
    email: body.email,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
