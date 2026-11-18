import "server-only";
export interface OtpDeliveryProvider { available: boolean; development: boolean; send(phone: string, code: string): Promise<{ accepted: boolean }>; }
/** In-process development sink, never exposed by an HTTP endpoint or logged. */
let developmentSink: ((phone: string, code: string) => void) | undefined;
export function useDevelopmentOtpSink(sink?: (phone: string, code: string) => void) {
  if (process.env.NODE_ENV === "production") throw Error("Development OTP is prohibited in production.");
  developmentSink = sink;
}
export function otpProvider(): OtpDeliveryProvider {
  if (process.env.NODE_ENV !== "production" && process.env.CAB_OTP_PROVIDER === "development" && developmentSink) return { available: true, development: true, async send(phone, code) { developmentSink?.(phone, code); return { accepted: true }; } };
  const configured = process.env.CAB_OTP_PROVIDER === "gateway" && process.env.CAB_OTP_GATEWAY_URL && process.env.CAB_OTP_GATEWAY_TOKEN;
  return { available: Boolean(configured), development: false, async send(phone, code) {
    if (!configured) return { accepted: false };
    const url = new URL(process.env.CAB_OTP_GATEWAY_URL!);
    if (url.protocol !== "https:" || url.username || url.password) throw Error("OTP gateway requires a secure configured URL.");
    // This is our gateway adapter contract, not an invented SMS vendor API.
    const response = await fetch(url, { method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000), headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.CAB_OTP_GATEWAY_TOKEN }, body: JSON.stringify({ phone, code, purpose: "cab-booking-access", expiresInSeconds: 300 }) });
    return { accepted: response.ok && (await response.json()).accepted === true };
  } };
}
