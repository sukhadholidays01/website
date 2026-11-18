import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { cookies } from "next/headers";
import { getDatabasePool } from "@/lib/db";
import { CabError, hash } from "@/lib/cab/security";
import { hashPassword, verifyPassword } from "./passwords.mjs";
import { sendSmtpEmail } from "@/lib/email/smtp";
import { customerEmail, customerLogin, customerSignup, customerToken, type CustomerProfile } from "./customer-validation";

export const customerCookie="sukhad_customer_session";
export const customerSessionSeconds=8*60*60;
export const verificationAcknowledgement="If this address is eligible, a verification link has been submitted. Check your inbox and spam folder. Inbox delivery is not confirmed.";
export class CustomerAuthError extends CabError {
  constructor(message:string,status=400,public code="AUTH_ERROR"){super(message,status);}
}
const iso=(date:unknown)=>new Date(String(date)).toISOString();
export function customerProfile(row:RowDataPacket):CustomerProfile {
  return {id:row.account_id,name:row.full_name,email:row.email,verified:Boolean(row.email_verified),status:row.account_status,createdAt:iso(row.created_at),lastLoginAt:row.last_login_at?iso(row.last_login_at):null};
}
export async function customerTransaction<T>(work:(db:PoolConnection)=>Promise<T>) {
  for(let attempt=0;attempt<3;attempt++) {
    const db=await getDatabasePool().getConnection();
    try {await db.beginTransaction();const result=await work(db);await db.commit();return result;}
    catch(error){await db.rollback();if((error as {code?:string}).code!=="ER_LOCK_DEADLOCK"||attempt===2)throw error;}
    finally{db.release();}
  }
  throw new CustomerAuthError("Please retry your request.",503);
}
function emailOrigin() {
  let url:URL;
  try{url=new URL(process.env.CAB_SITE_ORIGIN||process.env.APP_URL||"");}catch{throw new CustomerAuthError("Verification email is not configured. Please contact support.",503,"EMAIL_UNAVAILABLE");}
  const local=process.env.NODE_ENV!=="production"&&["localhost","127.0.0.1","[::1]"].includes(url.hostname);
  if(url.username||url.password||url.search||url.hash||(url.protocol!=="https:"&&!(local&&url.protocol==="http:")))throw new CustomerAuthError("Verification email requires a secure site URL.",503,"EMAIL_UNAVAILABLE");
  if(![process.env.SMTP_HOST,process.env.SMTP_USER,process.env.SMTP_PASS].every(Boolean))throw new CustomerAuthError("Verification email is temporarily unavailable. Please contact support.",503,"EMAIL_UNAVAILABLE");
  return url.origin;
}
async function activity(db:PoolConnection,id:string,name:string,kind:"customer_registered"|"customer_first_login"|"customer_login",key:string) {
  const title=kind==="customer_registered"?"New customer registered":kind==="customer_first_login"?"Customer completed first login":"Customer signed in";
  // Existing notifications table, not the email outbox queue. No auth secrets stored.
  await db.execute("INSERT IGNORE INTO notifications (notification_id,booking_id,notification_kind,audience,delivery_status,attempts,created_at,dedupe_key,subject,html_body,text_body,recipient) VALUES (?,NULL,?,'admin','recorded',0,UTC_TIMESTAMP(3),?,?,'',?,'')",
    [randomUUID(),kind,key,`${title} - ${name}`,JSON.stringify({customerId:id,href:`/admin/customers/${id}`})]);
}
async function issueVerification(db:PoolConnection,id:string) {
  const token=randomBytes(32).toString("hex");
  await db.execute("DELETE FROM customer_verification_tokens WHERE account_id=?",[id]);
  await db.execute("INSERT INTO customer_verification_tokens (token_hash,account_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 MINUTE))",[hash(token),id]);
  await db.execute("UPDATE customer_accounts SET verification_requested_at=UTC_TIMESTAMP(3) WHERE account_id=?",[id]);
  return token;
}
async function submitVerification(email:string,token:string,origin:string) {
  // A fragment prevents the raw token entering server access logs or referrers.
  const link=`${origin}/verify-email#token=${token}`;
  try {await sendSmtpEmail({to:email,subject:"Verify your Sukhad Holidays email",text:`Verify your email to sign in to Sukhad Holidays.\n\n${link}\n\nThis single-use link expires in 30 minutes. If you did not request it, ignore this email.`});}
  catch {
    await getDatabasePool().execute("DELETE FROM customer_verification_tokens WHERE token_hash=?",[hash(token)]);
    throw new CustomerAuthError("The verification email could not be submitted. Your account remains unverified. Try resending later.",503,"EMAIL_UNAVAILABLE");
  }
}
export async function registerCustomer(body:unknown) {
  const input=customerSignup.parse(body),origin=emailOrigin();
  const passwordHash=await hashPassword(input.password);
  let issued:{token:string;id:string}|null=null;
  try {
    issued=await customerTransaction(async db=>{
      const [existing]=await db.execute<RowDataPacket[]>("SELECT account_id FROM customer_accounts WHERE email=? FOR UPDATE",[input.email]);
      if(existing.length)return null;
      const id=randomUUID();
      await db.execute("INSERT INTO customer_accounts (account_id,email,full_name,password_hash,terms_accepted_at) VALUES (?,?,?,?,UTC_TIMESTAMP(3))",[id,input.email,input.fullName,passwordHash]);
      const token=await issueVerification(db,id);
      await activity(db,id,input.fullName,"customer_registered",`customer:registered:${id}`);
      return {token,id};
    });
  } catch(error) {if((error as {code?:string}).code!=="ER_DUP_ENTRY")throw error;}
  if(issued)await submitVerification(input.email,issued.token,origin);
  // Same response for existing accounts; never claims an unverified login.
  return {message:verificationAcknowledgement,cooldown:60};
}
export async function resendCustomerVerification(body:unknown) {
  const email=customerEmail.parse((body as {email?:unknown})?.email),origin=emailOrigin();
  const token=await customerTransaction(async db=>{
    const [rows]=await db.execute<RowDataPacket[]>("SELECT account_id,email_verified,account_status,verification_requested_at > DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 MINUTE) AS cooling FROM customer_accounts WHERE email=? FOR UPDATE",[email]);
    const row=rows[0];if(!row||row.email_verified||row.account_status!=="ACTIVE"||row.cooling)return null;
    return issueVerification(db,row.account_id);
  });
  if(token)await submitVerification(email,token,origin);
  return {message:verificationAcknowledgement,cooldown:60};
}
export async function verifyCustomerEmail(body:unknown) {
  const tokenHash=hash(customerToken.parse((body as {token?:unknown})?.token));
  await customerTransaction(async db=>{
    const [tokens]=await db.execute<RowDataPacket[]>("SELECT account_id FROM customer_verification_tokens WHERE token_hash=?",[tokenHash]);
    const invalid=()=>new CustomerAuthError("This verification link is invalid, expired or already used. Request a new link.",400,"INVALID_VERIFICATION");
    if(!tokens[0])throw invalid();
    const id=tokens[0].account_id;
    const [accounts]=await db.execute<RowDataPacket[]>("SELECT account_status,email_verified FROM customer_accounts WHERE account_id=? FOR UPDATE",[id]);
    const [valid]=await db.execute<RowDataPacket[]>("SELECT token_hash FROM customer_verification_tokens WHERE token_hash=? AND account_id=? AND expires_at>UTC_TIMESTAMP(3) FOR UPDATE",[tokenHash,id]);
    if(!valid.length||accounts[0]?.account_status!=="ACTIVE"||accounts[0]?.email_verified)throw invalid();
    await db.execute("UPDATE customer_accounts SET email_verified=TRUE,email_verified_at=UTC_TIMESTAMP(3) WHERE account_id=?",[id]);
    await db.execute("DELETE FROM customer_verification_tokens WHERE account_id=?",[id]);
  });
  return {message:"Your email is verified. You can now sign in."};
}
export async function loginCustomer(body:unknown) {
  const input=customerLogin.parse(body);
  const [matches]=await getDatabasePool().execute<RowDataPacket[]>("SELECT account_id,password_hash FROM customer_accounts WHERE email=?",[input.email]);
  const match=matches[0];
  const valid=await verifyPassword(input.password,match?.password_hash);
  const invalid=()=>new CustomerAuthError("Email or password is incorrect.",401,"INVALID_CREDENTIALS");
  if(!match||!valid)throw invalid();
  const token=randomBytes(32).toString("hex");
  await customerTransaction(async db=>{
    const [rows]=await db.execute<RowDataPacket[]>("SELECT * FROM customer_accounts WHERE account_id=? FOR UPDATE",[match.account_id]);
    const account=rows[0];if(!account||account.account_status!=="ACTIVE"||account.password_hash!==match.password_hash)throw invalid();
    if(!account.email_verified)throw new CustomerAuthError("Verify your email before signing in. You can request a new link below.",403,"EMAIL_UNVERIFIED");
    const first=!account.last_login_at;
    await db.execute("DELETE FROM customer_sessions WHERE account_id=? AND expires_at<=UTC_TIMESTAMP(3)",[account.account_id]);
    await db.execute("INSERT INTO customer_sessions (session_hash,account_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 8 HOUR))",[hash(token),account.account_id]);
    await db.execute("UPDATE customer_accounts SET last_login_at=UTC_TIMESTAMP(3) WHERE account_id=?",[account.account_id]);
    await activity(db,account.account_id,account.full_name,first?"customer_first_login":"customer_login",first?`customer:first-login:${account.account_id}`:`customer:login:${randomUUID()}`);
  });
  return token;
}
export async function customerSession(token?:string):Promise<CustomerProfile|null> {
  if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
  const [rows]=await getDatabasePool().execute<RowDataPacket[]>("SELECT a.account_id,a.full_name,a.email,a.email_verified,a.account_status,a.created_at,a.last_login_at FROM customer_sessions s JOIN customer_accounts a ON a.account_id=s.account_id WHERE s.session_hash=? AND s.expires_at>UTC_TIMESTAMP(3) AND a.email_verified=TRUE AND a.account_status='ACTIVE'",[hash(token)]);
  return rows[0]?customerProfile(rows[0]):null;
}
export async function currentCustomer(){return customerSession((await cookies()).get(customerCookie)?.value);}
export async function logoutCustomer(token?:string) {
  if(token&&/^[a-f0-9]{64}$/.test(token))await getDatabasePool().execute("DELETE FROM customer_sessions WHERE session_hash=?",[hash(token)]);
}
