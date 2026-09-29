import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const tokenEnvelopeSchema = z.object({
  body: z.string().min(1),
  sig: z.string().min(1),
});

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET is required to sign write confirmations.");
  }
  return value;
}

export function createConfirmToken(payload: Record<string, unknown>): string {
  const body = JSON.stringify({
    ...payload,
    exp: Date.now() + 10 * 60 * 1000,
  });
  const sig = createHmac("sha256", secret()).update(body).digest("hex");
  return Buffer.from(JSON.stringify({ body, sig })).toString("base64url");
}

export function verifyConfirmToken<T>(
  token: string,
  schema: z.ZodType<T>,
): T {
  let parsedEnvelope: unknown;
  try {
    parsedEnvelope = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    );
  } catch {
    throw new Error("Confirm token is invalid.");
  }
  const envelope = tokenEnvelopeSchema.parse(parsedEnvelope);
  const expected = createHmac("sha256", secret())
    .update(envelope.body)
    .digest("hex");
  const left = Buffer.from(envelope.sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Confirm token signature is invalid.");
  }
  const payload = JSON.parse(envelope.body) as { exp?: number } & T;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    throw new Error("Confirm token expired. Preview the change again.");
  }
  return schema.parse(payload);
}
