import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { hashPassword } from "../src/lib/auth/passwords.mjs";
import { databaseOptions } from "./db-environment.mjs";
const options=databaseOptions();
assert(options.database.endsWith("_dev") && process.env.NODE_ENV !== "production" && ["localhost","127.0.0.1","::1"].includes(options.host), "Loopback development DB only; never production");
const port=Number(process.env.CAB_SMOKE_PORT || 3122), origin="http://127.0.0.1:"+port;
const password=randomBytes(24).toString("hex");
const pool=mysql.createPool(options),ids=[randomUUID(),randomUUID()],emails=ids.map(id=>`smoke-${id}@example.invalid`),inserted=[];
let child;
try {
 const encoded=await hashPassword(password);
 for(let i=0;i<ids.length;i++){await pool.execute("INSERT INTO users (user_id,email,password_hash,role,is_active) VALUES (?,?,?,?,TRUE)",[ids[i],emails[i],encoded,i?"DISPATCHER":"OWNER"]);inserted.push(ids[i]);}
 child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-H","127.0.0.1","-p",String(port)],{windowsHide:true,stdio:["ignore","ignore","ignore"],env:{...process.env,NODE_ENV:"production",DB_HOST:options.host,DB_PORT:String(options.port),DB_USER:options.user,DB_PASSWORD:options.password,DB_NAME:options.database,CAB_STORAGE_MODE:"mysql",ADMIN_EMAIL_1:emails[0],ADMIN_EMAIL_2:emails[1],CAB_SESSION_SECRET:randomBytes(48).toString("hex"),CAB_SITE_ORIGIN:origin,CAB_EMAIL_MODE:"preview",CAB_EMAIL_SEND_ENABLED:"false",CAB_RAZORPAY_LIVE_ENABLED:"false",RAZORPAY_KEY_ID:"",RAZORPAY_KEY_SECRET:"",RAZORPAY_WEBHOOK_SECRET:""}});
 let ready=false;
 for(let i=0;i<100;i++){try{const r=await fetch(origin+"/api/health");if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}
 assert(ready,"Built server health did not become ready");
 for(const path of ["/cabs","/cabs/driver","/admin/login"]){const response=await fetch(origin+path);assert.equal(response.status,200,path);if(path==="/cabs/driver")assert(response.headers.get("permissions-policy").includes("geolocation=(self)"));}
 assert.equal((await fetch(origin+"/admin",{redirect:"manual"})).status,307);
 assert.equal((await fetch(origin+"/api/cab/admin")).status,401);
 const headers={Origin:origin,"Content-Type":"application/json","X-Forwarded-For":"127.3.0.250"};
 for(const email of emails){
  const login=await fetch(origin+"/api/admin/login",{method:"POST",headers,body:JSON.stringify({email,password})});assert.equal(login.status,200);
  const cookie=login.headers.get("set-cookie").split(";")[0];assert(login.headers.get("set-cookie").includes("HttpOnly"));assert(login.headers.get("set-cookie").includes("Secure"));assert(login.headers.get("set-cookie").includes("SameSite=Strict"));
  assert.equal((await(await fetch(origin+"/api/admin/session",{headers:{Cookie:cookie}})).json()).authenticated,true);
  assert.equal((await fetch(origin+"/admin",{headers:{Cookie:cookie},redirect:"manual"})).status,200);
  assert.equal((await(await fetch(origin+"/api/cab/session",{headers:{Cookie:cookie}})).json()).authenticated,true);
  assert.equal((await fetch(origin+"/api/admin/logout",{method:"POST",headers:{...headers,Cookie:cookie}})).status,200);
  assert.equal((await(await fetch(origin+"/api/admin/session",{headers:{Cookie:cookie}})).json()).authenticated,false);
  assert.equal((await fetch(origin+"/api/cab/admin",{headers:{Cookie:cookie}})).status,401);
 }
 assert.equal((await fetch(origin+"/api/admin/login",{method:"POST",headers,body:JSON.stringify({password})})).status,401);
 assert.equal((await fetch(origin+"/api/admin/login",{method:"POST",headers,body:JSON.stringify({email:emails[0],password:"incorrect"})})).status,401);
 assert.equal((await fetch(origin+"/api/admin/login",{method:"POST",headers,body:JSON.stringify({email:"unlisted@example.invalid",password})})).status,401);
 const disabled=await fetch(origin+"/api/cab/payments/bookings/SH-CAB-SYNTHETIC",{method:"POST",headers,body:JSON.stringify({option:"full"})});assert.equal(disabled.status,401);
 const mock=await fetch(origin+"/api/cab/payments/bookings/SH-CAB-SYNTHETIC",{method:"PATCH",headers,body:"{}"});assert.equal(mock.status,401);
 console.log("PASS built production-mode server against local development DB: both fixture admins, dedicated endpoints, protected dashboard, secure cookies, durable logout, legacy cab session compatibility, driver page and unauthenticated payment rejection. No real accounts or providers used.");
}catch(error){console.error("FAIL local production-mode smoke: "+(error instanceof assert.AssertionError?error.message:"LOCAL_SMOKE_UNAVAILABLE"));process.exitCode=1;}
finally{
 if(child&&child.exitCode===null&&child.signalCode===null){const exited=new Promise(resolve=>child.once("exit",resolve));child.kill();await exited;}
 try{for(const id of inserted){await pool.execute("DELETE FROM cab_admin_sessions WHERE user_id=?",[id]);await pool.execute("DELETE FROM users WHERE user_id=?",[id]);}}finally{await pool.end();}
}
