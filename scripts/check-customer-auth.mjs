import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import mysql from "mysql2/promise";
import { databaseOptions } from "./db-environment.mjs";
import { adminTestContext } from "./admin-test-context.mjs";
import { verifyPassword } from "../src/lib/auth/passwords.mjs";

// Real MySQL/domain/routes; only email transport and request-local cookies are
// test boundaries. Raw links/passwords stay in memory and are never printed.
export async function runCustomerAuthChecks(browserCheck) {
  nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
  const options=databaseOptions();
  assert(process.env.NODE_ENV!=="production"&&options.database.endsWith("_dev")&&["localhost","127.0.0.1"].includes(options.host),"Use only the local development database.");
  const pool=mysql.createPool(options),runId=randomUUID(),prefix=`auth-qa-${runId}`;
  const email=`${prefix}@example.invalid`,password="Aa1-"+randomBytes(24).toString("hex"),name=`Customer auth QA ${runId}`;
  const sent=[];let failMail=false,adminToken="";
  const smtp={sendSmtpEmail:async message=>{if(failMail)throw Error("Synthetic SMTP failure");sent.push(message);return {submitted:true,delivery:"unverified"};}};
  const {load,jar}=adminTestContext(pool,smtp);
  const service=load("src/lib/auth/customer"),admin=load("src/lib/auth/customer-admin"),security=load("src/lib/cab/security"),validation=load("src/lib/auth/customer-validation");
  const routes=load("src/app/api/customer/[...path]/route"),checks=[];
  const origin=process.env.CAB_SITE_ORIGIN||"http://localhost:3000";
  const signup={fullName:name,email,password,confirmation:password,consent:true};
  const latestToken=()=>new URL(sent.at(-1).text.match(/https?:\/\/\S+/)[0]).hash.slice("#token=".length);
  const query=async(sql,values=[]) => (await pool.execute(sql,values))[0];
  const row=async address=>(await query("SELECT * FROM customer_accounts WHERE email=?",[address]))[0];
  const context=path=>({params:Promise.resolve({path:path.split("/")})});
  const post=(path,body,requestOrigin=origin)=>routes.POST(new Request(origin+"/api/customer/"+path,{method:"POST",headers:{"Content-Type":"application/json",origin:requestOrigin,"x-forwarded-for":runId},body:JSON.stringify(body)}),context(path));
  const get=path=>routes.GET(new Request(origin+"/api/customer/"+path),context(path.split("?")[0]));
  const reject=async(fn,code)=>assert.rejects(fn,error=>error.code===code);
  try {
    assert.equal((await query("SELECT version FROM schema_migrations WHERE version='007'")).length,1,"Apply migration 007 first.");
    await assert.rejects(()=>service.registerCustomer({...signup,password:"weak",confirmation:"different"}));
    await assert.rejects(()=>service.registerCustomer({...signup,role:"OWNER"}));
    await service.registerCustomer({...signup,email:"  "+email.toUpperCase()+"  "});
    let account=await row(email);assert(account&&!account.email_verified&&account.phone===null);
    assert(account.password_hash!==password&&await verifyPassword(password,account.password_hash));
    let token=latestToken();assert(/^[a-f0-9]{64}$/.test(token));
    const stored=(await query("SELECT token_hash FROM customer_verification_tokens WHERE account_id=?",[account.account_id]))[0];
    assert(stored.token_hash===security.hash(token)&&stored.token_hash!==token);
    const duplicate=await service.registerCustomer(signup);assert.equal(duplicate.message,service.verificationAcknowledgement);assert.equal(sent.length,1);
    assert.equal((await query("SELECT account_id FROM customer_accounts WHERE email=?",[email])).length,1);
    checks.push("registration, normalized/duplicate email, role rejection, password hashing and hash-only verification storage");
    await reject(()=>service.loginCustomer({email,password:"Wrong-password-1234"}),"INVALID_CREDENTIALS");
    await reject(()=>service.loginCustomer({email,password}),"EMAIL_UNVERIFIED");
    await service.resendCustomerVerification({email});assert.equal(sent.length,1,"Cooldown prevents duplicate mail.");
    await pool.execute("UPDATE customer_accounts SET verification_requested_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 MINUTE) WHERE account_id=?",[account.account_id]);
    await service.resendCustomerVerification({email});assert.equal(sent.length,2);const replacement=latestToken();assert(replacement!==token);
    await reject(()=>service.verifyCustomerEmail({token}),"INVALID_VERIFICATION");
    token=replacement;await pool.execute("UPDATE customer_verification_tokens SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND) WHERE account_id=?",[account.account_id]);
    await reject(()=>service.verifyCustomerEmail({token}),"INVALID_VERIFICATION");
    await pool.execute("UPDATE customer_accounts SET verification_requested_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 MINUTE) WHERE account_id=?",[account.account_id]);
    await service.resendCustomerVerification({email});token=latestToken();await service.verifyCustomerEmail({token});
    await reject(()=>service.verifyCustomerEmail({token}),"INVALID_VERIFICATION");
    checks.push("invalid/unverified login, resend cooldown, token replacement, expiry, verification and replay prevention");
    const first=await service.loginCustomer({email,password});let profile=await service.customerSession(first);assert(profile?.verified&&profile.name===name);
    assert(!JSON.stringify(profile).includes("password")&&!JSON.stringify(profile).includes("token"));
    await pool.execute("UPDATE customer_sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND) WHERE session_hash=?",[security.hash(first)]);assert.equal(await service.customerSession(first),null);
    const second=await service.loginCustomer({email,password});assert(await service.customerSession(second));await service.logoutCustomer(second);assert.equal(await service.customerSession(second),null);
    await pool.execute("UPDATE customer_accounts SET account_status='SUSPENDED' WHERE account_id=?",[account.account_id]);await reject(()=>service.loginCustomer({email,password}),"INVALID_CREDENTIALS");await pool.execute("UPDATE customer_accounts SET account_status='ACTIVE' WHERE account_id=?",[account.account_id]);
    checks.push("verified login, safe profile, expired sessions, logout revocation and suspended accounts");
    assert.equal((await post("login",{email,password},"https://untrusted.invalid")).status,403);
    jar.clear();assert.equal((await get("session")).status,401);assert.equal((await get("admin/customers")).status,401);
    let response=await post("login",{email,password});assert.equal(response.status,200);assert(jar.get(service.customerCookie));assert.equal((await get("session")).status,200);
    assert.equal((await get("admin/customers")).status,401);jar.set("cab_ops_session",jar.get(service.customerCookie));assert.equal((await get("admin/customers")).status,401);jar.delete("cab_ops_session");
    response=await post("logout",{});assert.equal(response.status,200);assert.equal((await get("session")).status,401);
    for(const next of ["https://evil.invalid","//evil.invalid","/admin","/api/cab/admin","/\\evil.invalid"])assert.equal(validation.safeCustomerReturn(next),"/account");assert.equal(validation.safeCustomerReturn("/holidays?destination=Goa"),"/holidays?destination=Goa");
    checks.push("real route handlers: CSRF, customer sessions, logout, customer-to-admin isolation and redirect safety");
    const allowed=load("src/lib/auth/allowlist").adminAllowlist();
    const staff=(await query("SELECT user_id,role FROM users WHERE email IN (?,?) AND is_active=TRUE LIMIT 1",allowed))[0];assert(staff,"An existing active allowlisted staff identity is required for admin boundary tests.");
    adminToken=security.issueAdminSession(security.staffRole(staff.role));await security.registerCabSession(adminToken,staff.user_id);jar.set("cab_ops_session",adminToken);
    response=await get("admin/customers?"+new URLSearchParams({q:prefix,verified:"yes"}));assert.equal(response.status,200);let list=await response.json();assert.equal(list.customers.length,1);assert(!JSON.stringify(list).includes("password_hash"));
    const detail=await admin.customerAccountDetail(account.account_id);assert.equal(detail.email,email);assert(!Object.hasOwn(detail,"password_hash"));
    let activity=await admin.customerActivity(staff.user_id);const registered=activity.notifications.filter(n=>n.title.includes(name));assert(registered.length>=3);
    for(const n of registered){assert(n.href.endsWith(account.account_id));assert(!JSON.stringify(n).includes(token));}
    const before=activity.unread;await admin.readCustomerActivity(staff.user_id,{id:registered[0].id});activity=await admin.customerActivity(staff.user_id);assert.equal(activity.unread,before-1);
    const kinds=await query("SELECT notification_kind,COUNT(*) n FROM notifications WHERE dedupe_key IN (?,?) GROUP BY notification_kind",[`customer:registered:${account.account_id}`,`customer:first-login:${account.account_id}`]);assert(kinds.length===2&&kinds.every(k=>Number(k.n)===1));
    checks.push("admin authorization, safe search/detail, persisted activity/read receipts and registration/first-login deduplication");
    let exhausted=false;for(let i=0;i<14;i++){const result=await post("login",{email:`missing-${runId}@example.invalid`,password});if(result.status===429){exhausted=true;break;}}assert(exhausted,"Login rate limiting must reject repeated attempts.");
    const failedEmail=`${prefix}-mail@example.invalid`;failMail=true;await reject(()=>service.registerCustomer({...signup,email:failedEmail}),"EMAIL_UNAVAILABLE");failMail=false;
    const failed=await row(failedEmail);assert(failed&&!failed.email_verified);assert.equal((await query("SELECT token_hash FROM customer_verification_tokens WHERE account_id=?",[failed.account_id])).length,0);
    checks.push("persistent login rate limits and SMTP failure without verification/authentication success");
    if(browserCheck)await browserCheck({email,password,accountId:account.account_id,adminToken,pool,load,jar,getVerificationToken:latestToken});
    console.log(JSON.stringify({passed:true,checks,emailTransport:"intercepted; no external email sent",localMysql:true}));
  } finally {
    const accounts=await query("SELECT account_id,email FROM customer_accounts WHERE email LIKE ?",[prefix+"%@example.invalid"]);
    const ids=new Set(accounts.map(a=>a.account_id));
    const notes=await query("SELECT notification_id,text_body FROM notifications WHERE notification_kind IN ('customer_registered','customer_first_login','customer_login')");
    for(const note of notes){let id;try{id=JSON.parse(note.text_body).customerId;}catch{continue;}if(ids.has(id)){await pool.execute("DELETE FROM notification_reads WHERE notification_id=?",[note.notification_id]);await pool.execute("DELETE FROM notifications WHERE notification_id=?",[note.notification_id]);}}
    for(const account of accounts){await pool.execute("DELETE FROM customer_sessions WHERE account_id=?",[account.account_id]);await pool.execute("DELETE FROM customer_verification_tokens WHERE account_id=?",[account.account_id]);await pool.execute("DELETE FROM customer_accounts WHERE account_id=?",[account.account_id]);for(const action of ["login","resend"])await pool.execute("DELETE FROM cab_rate_limits WHERE bucket_key=?",[security.hash(`customer:${action}:email:${security.hash(account.email)}:customer-email`)]);}
    for(const action of ["register","login","resend","verify","logout"])await pool.execute("DELETE FROM cab_rate_limits WHERE bucket_key=?",[security.hash(`customer:${action}:${runId}`)]);
    await pool.execute("DELETE FROM cab_rate_limits WHERE bucket_key=?",[security.hash(`customer:login:email:${security.hash(`missing-${runId}@example.invalid`)}:customer-email`)]);
    if(adminToken)await pool.execute("DELETE FROM cab_admin_sessions WHERE session_hash=?",[security.hash(adminToken)]);
    await pool.end();
  }
}
if(process.argv[1]===fileURLToPath(import.meta.url))runCustomerAuthChecks().catch(error=>{console.error("FAIL customer auth checks: "+error.message);process.exitCode=1;});
