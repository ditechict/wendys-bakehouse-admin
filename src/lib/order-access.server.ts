import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TTL_MS = 24 * 60 * 60 * 1000;

/** Server-only bearer capability, issued only after the order RPC succeeds. */
function signingKey(): string {
  const secret = process.env["ORDER_ACCESS_SECRET"];
  if (!secret || secret.length < 32) throw new Error("Order access is not configured.");
  return secret;
}

export function issueOrderAccess(orderId: string): string {
  const payload = Buffer.from(JSON.stringify({
    id: orderId, exp: Date.now() + TTL_MS, nonce: randomBytes(16).toString("hex"),
  })).toString("base64url");
  const signature = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return payload + "." + signature;
}

export function verifyOrderAccess(token: string): string | null {
  if (token.length > 1024 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", signingKey()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      id?: unknown; exp?: unknown;
    };
    if (typeof decoded.id !== "string" || !/^[0-9a-f-]{36}$/i.test(decoded.id)) return null;
    if (typeof decoded.exp !== "number" || decoded.exp <= Date.now() ||
        decoded.exp > Date.now() + TTL_MS) return null;
    return decoded.id;
  } catch {
    return null;
  }
}
