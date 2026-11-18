import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { databaseOptions } from "./db-environment.mjs";
const options=databaseOptions();
assert(options.database.endsWith("_dev") && process.env.NODE_ENV !== "production", "Local development DB only");
const port=Number(process.env.CAB_SMOKE_PORT || 3122), origin="http://127.0.0.1:"+port;
const password=randomBytes(24).toString("hex");
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-H","127.0.0.1","-p",String(port)],{windowsHide:true,stdio:["ignore","ignore","ignore"],env:{...process.env,NODE_ENV:"production",CAB_STORAGE_MODE:"mysql",CAB_ADMIN_PASSWORD:password,CAB_SESSION_SECRET:randomBytes(48).toString("hex"),CAB_SITE_ORIGIN:origin,CAB_EMAIL_MODE:"preview",CAB_EMAIL_SEND_ENABLED:"false",CAB_RAZORPAY_LIVE_ENABLED:"false",RAZORPAY_KEY_ID:"",RAZORPAY_KEY_SECRET:"",RAZORPAY_WEBHOOK_SECRET:""}});
try {
 let ready=false;
 for(let i=0;i<100;i++){try{const r=await fetch(origin+"/api/health");if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}
 assert(ready,"Built server health did not become ready");
 for(const path of ["/cabs","/cabs/driver","/admin/cab-operations"]){const response=await fetch(origin+path);assert.equal(response.status,200,path);if(path==="/cabs/driver")assert(response.headers.get("permissions-policy").includes("geolocation=(self)"));}
 assert.equal((await fetch(origin+"/api/cab/admin")).status,401);
 const headers={Origin:origin,"Content-Type":"application/json","X-Forwarded-For":"127.3.0.250"};
 const login=await fetch(origin+"/api/cab/session",{method:"POST",headers,body:JSON.stringify({password})});assert.equal(login.status,200);
 const cookie=login.headers.get("set-cookie").split(";")[0];assert(login.headers.get("set-cookie").includes("HttpOnly"));assert(login.headers.get("set-cookie").includes("Secure"));
 assert.equal((await(await fetch(origin+"/api/cab/session",{headers:{Cookie:cookie}})).json()).authenticated,true);
 assert.equal((await fetch(origin+"/api/cab/session",{method:"DELETE",headers:{...headers,Cookie:cookie}})).status,200);
 assert.equal((await(await fetch(origin+"/api/cab/session",{headers:{Cookie:cookie}})).json()).authenticated,false);
 assert.equal((await fetch(origin+"/api/cab/admin",{headers:{Cookie:cookie}})).status,401);
 const disabled=await fetch(origin+"/api/cab/payments/bookings/SH-CAB-SYNTHETIC",{method:"POST",headers,body:JSON.stringify({option:"full"})});assert.equal(disabled.status,503);
 const mock=await fetch(origin+"/api/cab/payments/bookings/SH-CAB-SYNTHETIC",{method:"PATCH",headers,body:"{}"});assert.equal(mock.status,403);
 console.log("PASS built production server: MySQL health, cab/customer/driver/admin pages, driver GPS permissions policy, Secure/HttpOnly authentication, durable logout/replayed cookie rejection, disabled gateway without mock fallback and production simulation prohibition");
}finally{child.kill();}
