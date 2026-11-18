import assert from "node:assert/strict";
import { randomBytes,randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import mysql from "mysql2/promise";
import { databaseOptions } from "./db-environment.mjs";
import { hashPassword } from "../src/lib/auth/passwords.mjs";
import { adminTestContext } from "./admin-test-context.mjs";
nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const options=databaseOptions();assert(process.env.NODE_ENV!=="production"&&options.database.endsWith("_dev"));
const pool=mysql.createPool(options),ids=[randomUUID(),randomUUID(),randomUUID(),randomUUID()];
const emails=ids.map(id=>`allowlist-${id}@example.invalid`),password=randomBytes(24).toString("hex");
process.env.ADMIN_EMAIL_1=emails[0];process.env.ADMIN_EMAIL_2=emails[1];
const {load,jar}=adminTestContext(pool),security=load("src/lib/cab/security"),auth=load("src/lib/auth/admin"),allowlist=load("src/lib/auth/allowlist");
try{
 const encoded=await hashPassword(password);
 for(let i=0;i<ids.length;i++)await pool.execute("INSERT INTO users (user_id,email,password_hash,role,is_active) VALUES (?,?,?,?,TRUE)",[ids[i],emails[i],encoded,i===3?"CUSTOMER":"OWNER"]);
 for(let i=0;i<2;i++){const user=await auth.authenticateAdmin({email:emails[i].toUpperCase()+" ",password});assert(user.id===ids[i]);}
 await assert.rejects(auth.authenticateAdmin({email:emails[0],password:"incorrect"}));
 await assert.rejects(auth.authenticateAdmin({email:emails[2],password}));
 await assert.rejects(auth.authenticateAdmin({email:emails[3],password}));
 console.log("PASS both approved admins, normalisation, incorrect password, unlisted admin and customer rejection");
 const session=security.issueAdminSession("OWNER");await security.registerCabSession(session,ids[0]);jar.set("cab_ops_session",session);assert(await security.hasCabAdmin());
 process.env.ADMIN_EMAIL_1=emails[2];assert(!(await security.hasCabAdmin()));process.env.ADMIN_EMAIL_1=emails[0];assert(await security.hasCabAdmin());
 const account=await auth.authenticateAdmin({email:emails[0],password});assert(account.role==="OWNER");
 process.env.ADMIN_EMAIL_2="";assert(!allowlist.adminAllowlistConfigured());assert(!(await security.hasCabAdmin()));await assert.rejects(auth.authenticateAdmin({email:emails[0],password}));
 process.env.ADMIN_EMAIL_2=" "+emails[0].toUpperCase()+" ";assert(!allowlist.adminAllowlistConfigured());await assert.rejects(auth.authenticateAdmin({email:emails[0],password}));process.env.ADMIN_EMAIL_2=emails[1];
 console.log("PASS missing/duplicate configuration fails closed and allowlist rechecked for active sessions");
 await pool.execute("UPDATE users SET is_active=FALSE WHERE user_id=?",[ids[0]]);assert(!(await security.hasCabAdmin()));await assert.rejects(auth.authenticateAdmin({email:emails[0],password}));
 await pool.execute("UPDATE users SET is_active=TRUE,role='VIEWER' WHERE user_id=?",[ids[0]]);assert(await security.cabAdminRole()==="VIEWER");await assert.rejects(security.requireCabPermission("settings"));
 await pool.execute("UPDATE users SET role='CUSTOMER' WHERE user_id=?",[ids[0]]);assert(!(await security.hasCabAdmin()));
 await pool.execute("UPDATE users SET role='OWNER' WHERE user_id=?",[ids[0]]);
 await pool.execute("UPDATE cab_admin_sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND) WHERE user_id=?",[ids[0]]);assert(!(await security.hasCabAdmin()));
 const fresh=security.issueAdminSession("OWNER");await security.registerCabSession(fresh,ids[0]);jar.set("cab_ops_session",fresh);assert(await security.hasCabAdmin());await security.revokeCabSession(fresh);assert(!(await security.hasCabAdmin()));
 jar.set("cab_ops_session",fresh+"tampered");assert(!(await security.hasCabAdmin()));await assert.rejects(security.requireCabAdmin());
 console.log("PASS inactive accounts, current role enforcement, customer-role denial, expiry, tampering, logout and revoked-session replay");
}catch{console.error("FAIL two-admin access checks; no credentials or session values logged.");process.exitCode=1;}
finally{for(const id of ids){await pool.execute("DELETE FROM cab_admin_sessions WHERE user_id=?",[id]);await pool.execute("DELETE FROM users WHERE user_id=?",[id]);}await pool.end();}
