import "server-only";
import nodemailer, { type SendMailOptions } from "nodemailer";
import { smtpConfigurationProblems } from "./smtp-configuration.mjs";
export function safeSmtpFailure(error: unknown) {
  const e = error as { code?: string; responseCode?: number } | null;
  const code = e?.code && /^[A-Z0-9_]{1,40}$/.test(e.code) ? e.code : "SMTP_UNAVAILABLE";
  const stage = code === "SMTP_CONFIGURATION" ? "configuration" : code === "EAUTH" ? "authentication" : ["ECONNECTION", "ECONNREFUSED", "ETIMEDOUT", "ESOCKET", "EDNS", "ENOTFOUND"].includes(code) ? "connection" : "submission";
  return { stage, code, responseCode: typeof e?.responseCode === "number" ? e.responseCode : undefined };
}
export async function verifySmtpConnection() {
  const transport = createSmtpTransport();
  try { await transport.verify(); return { connected: true, authenticated: true }; }
  catch (error) { console.warn(JSON.stringify({ event: "smtp_verification_failed", ...safeSmtpFailure(error) })); throw error; }
  finally { transport.close(); }
}

/** Shared Hostinger SMTP transport for booking and account emails. Never logs message bodies. */
export function createSmtpTransport() {
  const sender = process.env.SMTP_USER;
  if (smtpConfigurationProblems(process.env).length)
    throw Object.assign(new Error("SMTP configuration is incomplete or invalid."), { code: "SMTP_CONFIGURATION" });
  const port = Number(process.env.SMTP_PORT || 465);
  if (![465, 587].includes(port)) throw new Error("Use SMTP TLS port 465 or STARTTLS port 587.");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: true,
    auth: { user: sender, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
}
export async function sendSmtpEmail(message: Pick<SendMailOptions, "to" | "replyTo" | "subject" | "text" | "html" | "messageId">) {
  const transport = createSmtpTransport();
  try {
    const result = await transport.sendMail({ ...message, from: { name: "Sukhadh Holidays", address: process.env.SMTP_USER! } });
    if (!result.accepted?.length || result.rejected?.length) throw new Error("SMTP recipient was not accepted.");
    return { submitted: true, delivery: "unverified" as const };
  } catch (error) { console.warn(JSON.stringify({ event: "smtp_submission_failed", ...safeSmtpFailure(error) })); throw error; }
  finally { transport.close(); }
}
