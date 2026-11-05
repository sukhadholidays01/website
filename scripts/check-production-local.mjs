import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { writeFile } from "node:fs/promises";
import { databaseOptions } from "./db-environment.mjs";
import { loadCabModule } from "./cab-test-loader.mjs";
const options=databaseOptions();assert(options.database.endsWith("_dev"),"Local smoke test requires _dev DB");
const origin="http://127.0.0.1:3127";
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-H","127.0.0.1","-p","3127"],{env:{...process.env,NODE_ENV:"production",CAB_SITE_ORIGIN:origin,CAB_STORAGE_MODE:"mysql",CAB_EMAIL_MODE:"preview",CAB_EMAIL_SEND_ENABLED:"false"},stdio:"ignore"});
const checks=[]; const pass=s=>{checks.push(s);console.log("PASS",s)};
async function api(path,method="GET",body,token,status=200) {
 const r=await fetch(origin+"/api/cab/"+path,{method,headers:{Origin:origin,"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal(r.status,status,path);return r.json();
}
try {
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin)).ok){ready=true;break}}catch{}await wait(500)}assert(ready,"Server did not start");
 for(const p of ["/","/about","/contact","/cabs","/taxi","/flights","/bus","/holidays","/holidays/ayodhya","/custom-routes","/privacy","/terms","/icon.png"]){const r=await fetch(origin+p);assert.equal(r.status,200,p);assert.equal(r.headers.get("x-content-type-options"),"nosniff");}
 pass("Public pages and favicon return 200; security headers present");
 const health=await fetch(origin+"/api/health");assert.equal(health.status,200);assert.deepEqual(await health.json(),{status:"ok"});pass("Production server health reaches local MySQL");
 const cat=await api("catalogue");assert(cat.persistent);assert.equal(cat.mode,"mysql");
 const {cabPlaces}=loadCabModule("src/data/cabPlaces");
 const body={journey:{tripType:"one-way",airportDirection:"pickup",origin:cabPlaces[0],destination:cabPlaces[1],departure:new Date(Date.now()+8*86400000).toISOString().slice(0,16),vehicle:"sedan",passengers:2,pickupAddress:"Controlled API test pickup",dropAddress:"Controlled API test drop"},customer:{name:"Local API Readiness Test",phone:"9000000000",email:"api-readiness@example.invalid",notes:"Controlled local API test"},consent:true,requestKey:randomUUID(),accessToken:randomBytes(32).toString("hex")};
 const search=await api("search","POST",{journey:body.journey});assert(search.options.length>0);assert.equal(search.fare.total,null);pass("Journey search returns request categories without invented prices");
 await api("bookings","POST",{...body,customer:{...body.customer,phone:"bad"}},undefined,400);
 const first=await api("bookings","POST",body,undefined,201);const b=first.booking;
 assert.equal(b.status,"REQUESTED");assert.equal(b.fare.total,null);assert.equal(first.persistent,true);
 assert.equal((await api("bookings","POST",body,undefined,201)).booking.id,b.id);
 await api("bookings/"+b.id,"GET",undefined,undefined,403);
 assert.equal((await api("bookings/"+b.id,"GET",undefined,body.accessToken)).booking.id,b.id);
 const page=await fetch(origin+"/cabs/booking/"+b.id);assert.equal(page.status,200);
 assert.equal((await api("bookings/"+b.id,"PATCH",{action:"cancel"},body.accessToken)).booking.status,"CANCELLED");
 assert.equal((await api("bookings/"+b.id,"GET",undefined,body.accessToken)).booking.status,"CANCELLED");
 pass("HTTP booking, invalid customer, idempotency, private lookup, confirmation route and persisted cancellation");
 const denied=await fetch(origin+"/api/cab/quote",{method:"POST",headers:{Origin:"https://untrusted.invalid","Content-Type":"application/json"},body:JSON.stringify(body)});assert.equal(denied.status,403);
 await api("admin","GET",undefined,undefined,401);pass("Cross-origin write and unauthenticated operations rejected");
 const {getDatabasePool}=loadCabModule("src/lib/db");
 try {const [rows]=await getDatabasePool().execute("SELECT booking_status FROM bookings WHERE booking_id=?",[b.id]);assert.equal(rows[0].booking_status,"CANCELLED");}finally{await getDatabasePool().end()}
 pass("API result independently verified in MySQL; controlled cancelled record retained: "+b.id);
 await writeFile("docs/production-local-test-results.json",JSON.stringify({testedAt:new Date().toISOString(),target:"local production server / development MySQL only",checks},null,2)+"\n");
} finally {child.kill();}
