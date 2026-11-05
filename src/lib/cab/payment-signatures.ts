import { createHmac, timingSafeEqual } from "node:crypto";
const constantEqual = (a: string, b: string) => {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
) {
  if (!secret || !orderId || !paymentId || !/^[a-f0-9]{64}$/i.test(signature))
    return false;
  return constantEqual(
    createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex"),
    signature.toLowerCase(),
  );
}
export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
  secret: string,
) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return constantEqual(
    createHmac("sha256", secret).update(rawBody).digest("hex"),
    signature.toLowerCase(),
  );
}
