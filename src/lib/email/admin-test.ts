import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDatabasePool } from "@/lib/db";
import { CabError } from "@/lib/cab/security";
import { safeSmtpFailure, sendSmtpEmail, verifySmtpConnection } from "./smtp";
export async function testAdminEmail(body: unknown, role: string) {
  const input=z.object({email:z.string().trim().email().max(190)}).safeParse(body);
  if(!input.success)throw new CabError("Enter a valid test recipient email.");
  const eventId=randomUUID();
  try {
    await verifySmtpConnection();
    await sendSmtpEmail({to:input.data.email,subject:"Sukhadh Holidays — Email service test",text:"This is an email service test requested by an authorised Sukhadh Holidays administrator. It contains no account credentials or password-reset link. No action is required."});
    await getDatabasePool().execute("INSERT INTO cab_audit_log (event_id,actor_role,action,entity_id,created_at) VALUES (?,?,'SMTP_TEST_ACCEPTED',?,UTC_TIMESTAMP(3))",[eventId,role,eventId]);
    return {connected:true,authenticated:true,submitted:true,delivery:"unverified",message:"SMTP connection and authentication passed. The server accepted the test email. Inbox delivery is not independently verified."};
  } catch(error) {
    const diagnostic=safeSmtpFailure(error);
    await getDatabasePool().execute("INSERT INTO cab_audit_log (event_id,actor_role,action,entity_id,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(3))",[eventId,role,`SMTP_TEST_${diagnostic.stage.toUpperCase()}_FAILED`,eventId]);
    throw new CabError("Email test failed. Review the recorded email-service event and server diagnostics. No inbox delivery was confirmed.",503);
  }
}
