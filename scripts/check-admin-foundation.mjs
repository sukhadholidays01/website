import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir,mkdtemp,readFile,writeFile } from "node:fs/promises";
import path from "node:path";
import WebSocket from "next/dist/compiled/ws/index.js";
const origin="http://localhost:3000",folder="artifacts/admin-access-refresh/phase-1";
const executable=["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
assert(executable,"A local Chrome/Edge installation is required");
import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
import {adminTestContext}from'./admin-test-context.mjs';
nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
assert(process.env.NODE_ENV!=='production'&&process.env.DB_NAME?.endsWith('_dev'),'Local development database required');
const pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,timezone:'Z'});
const security=adminTestContext(pool).load('src/lib/cab/security');
let testToken='',loginStatus='not run';

await mkdir(folder,{recursive:true});
const profile=await mkdtemp(path.resolve(folder,"browser-"));
const browser=spawn(executable,["--headless=new","--disable-gpu","--remote-debugging-port=0","--remote-debugging-address=127.0.0.1","--no-first-run",`--user-data-dir=${profile}`,"about:blank"],{windowsHide:true,stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let ws;let stage="browser startup";const errors=[],checks=[];
try{
 let port;for(let i=0;i<100;i++){try{port=(await readFile(path.join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0];break;}catch{await sleep(150);}}
 assert(port,"Browser did not start");const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();ws=new WebSocket(tabs.find(t=>t.type==="page").webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.once("open",resolve);ws.once("error",reject);});
 let sequence=0;const pending=new Map();
 ws.on("message",raw=>{const message=JSON.parse(raw);if(message.id){pending.get(message.id)?.(message);pending.delete(message.id);}if(message.method==="Runtime.exceptionThrown")errors.push(message.params.exceptionDetails.text);});
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error("Browser command timed out"));},120000);pending.set(id,result=>{clearTimeout(timer);resolve(result);});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await command("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(result.result?.exceptionDetails)throw Error("Browser evaluation failed: "+String(result.result.exceptionDetails.exception?.description||result.result.exceptionDetails.text).split("\n")[0]);return result.result?.result?.value;};
 const until=async expression=>{for(let i=0;i<240;i++){if(await evaluate(expression))return;await sleep(250);}throw Error("UI state did not become ready");};
 const navigate=async url=>{await command("Page.navigate",{url:origin+url});await until(`location.pathname + location.search === ${JSON.stringify(url)} && document.readyState === "complete"`);await sleep(1000);};
 const shot=async name=>{const response=await command("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await writeFile(`${folder}/${name}.png`,Buffer.from(response.result.data,"base64"));};
 await command("Runtime.enable");await command("Page.enable");await command("Network.enable");

 stage='guest authorization';
 for(const url of ['/admin','/admin/cab-operations','/admin/packages','/admin/users']){const response=await fetch(origin+url,{redirect:'manual'});assert(response.status===307&&response.headers.get('location')?.includes('/admin/login'));}
 assert((await fetch(origin+'/api/cab/admin')).status===401);
 assert((await fetch(origin+'/api/cab/admin/email-test',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:'test@example.invalid'})})).status===401);
 checks.push({authorization:'guest pages and protected APIs rejected'});
 stage='admin session setup';
 const login=await fetch(origin+'/api/cab/session',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL_1,password:process.env.CAB_ADMIN_PASSWORD||''})});
 if(login.ok){testToken=login.headers.get('set-cookie')?.match(/cab_ops_session=([^;]+)/)?.[1]||'';testToken=decodeURIComponent(testToken);loginStatus='PASS existing configured account credentials';}
 else{loginStatus='NOT VERIFIED: bootstrap password differs from stored account password';const[users]=await pool.execute('SELECT user_id FROM users WHERE email=? AND is_active=TRUE',[process.env.ADMIN_EMAIL_1]);assert(users.length===1);testToken=security.issueAdminSession('OWNER');await security.registerCabSession(testToken,users[0].user_id);}
 assert(testToken);
 await command('Network.setCookie',{name:'cab_ops_session',value:testToken,url:origin,httpOnly:true,sameSite:'Strict',path:'/'});
 stage='dashboard direct access';await navigate('/admin');await until('document.querySelector("h1")?.textContent.includes("Operations overview")');await until('document.querySelectorAll(".a-stat").length===4');
 assert(await evaluate('sessionStorage.getItem("sukhad-demo-session")===null'));
 const [counts]=await pool.query('SELECT COUNT(*) AS total FROM bookings');assert(await evaluate('document.querySelector(".a-stat strong").textContent')===String(counts[0].total));
 checks.push({dashboard:'database count verified',demoSessionRequired:false});
 for(const width of(process.argv.includes("--logout-only")?[]:[1440,820,390])){
  stage='responsive '+width;await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
  await navigate('/admin');await until('document.querySelectorAll(".a-stat").length===4');assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));
  if(width<901){await evaluate('document.querySelector(".a-menu-toggle").click()');await until('!!document.querySelector(".a-mobile-drawer")');await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until('!document.querySelector(".a-mobile-drawer")');}
  await shot('overview-'+width);
  await navigate('/admin/packages');await until('!!document.querySelector(".a-demo-banner") && !!document.querySelector("h1")');assert(await evaluate('document.body.textContent.includes("Demo module")'));assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));await shot('demo-packages-'+width);
  await command('Page.reload');await until('document.readyState==="complete" && !!document.querySelector(".a-demo-banner") && !!document.querySelector("h1")');assert(await evaluate('location.pathname==="/admin/packages"'));
  await navigate('/admin/cab-operations?view=routes');await until('!!document.querySelector(".cb-embedded") && !!document.querySelector(".cb-op-tabs button.active")');await until('document.querySelector(".cb-op-tabs button.active")?.textContent.includes("Routes")');assert(await evaluate('document.querySelectorAll("#main-content").length===1'));assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));
  // Exercise client navigation back to overview rather than only full reloads.
  await evaluate('Array.from(document.querySelectorAll("a")).find(a=>a.getAttribute("href")==="/admin").click()');await until('location.pathname==="/admin"&&document.querySelectorAll(".a-stat").length===4');
  checks.push({width,refresh:true,generalAndCabNavigation:true,mobileDrawer:width<901,overflow:false});
 }
 if(process.argv.includes('--phase4')){
  for(const width of [1440,820,390]){stage='automation responsive '+width;await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});await navigate('/admin/cab-operations?view=automation');await until('document.body.textContent.includes("Last completed job:")');assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));assert(await evaluate('document.body.textContent.includes("Existing outbox")'));assert(await evaluate('document.querySelector(".cb-automation").getBoundingClientRect().right<=innerWidth+2'));await shot('automation-'+width);}
  await command('Network.setBlockedURLs',{urls:['*/api/cab/admin/automation*']});await navigate('/admin/cab-operations?view=automation');await until('!!document.querySelector(".a-error-state")');assert(await evaluate('!document.body.textContent.includes("Last completed job:")'));await command('Network.setBlockedURLs',{urls:[]});await evaluate('document.querySelector(".a-error-state button").click()');await until('document.body.textContent.includes("Last completed job:")');checks.push({phase4:'automation at 1440/820/390, real outbox, unavailable state and retry; no worker action/provider call'});
 }
 stage='dashboard failure state';await command('Network.setBlockedURLs',{urls:['*/api/cab/admin/operations-overview']});await navigate('/admin');await until('!!document.querySelector(".a-error-state")');assert(await evaluate('document.querySelectorAll(".a-stat").length===0'));await command('Network.setBlockedURLs',{urls:[]});await evaluate('document.querySelector(".a-error-state button").click()');await until('document.querySelectorAll(".a-stat").length===4');checks.push({dashboardError:'no fake zero totals; retry recovered'});
 stage='logout page';await navigate('/admin/packages');await until('!!document.querySelector(".a-demo-banner")');
 if(await evaluate('innerWidth<901')){await evaluate('document.querySelector(".a-menu-toggle").click()');await until('!!document.querySelector(".a-mobile-drawer")');}
 stage='logout open';await shot('logout-before');await evaluate('Array.from(document.querySelectorAll("button")).find(button=>button.getAttribute("aria-label")==="Sign out of admin" && button.getClientRects().length)?.click()');await until('!!document.querySelector(".a-modal")');stage='logout modal action';await shot('logout-modal');await evaluate('Array.from(document.querySelectorAll(".a-modal button")).find(b=>b.textContent==="Stay signed in").click()');assert(await evaluate('location.pathname==="/admin/packages"'));
 await evaluate('Array.from(document.querySelectorAll("button")).find(button=>button.getAttribute("aria-label")==="Sign out of admin" && button.getClientRects().length)?.click()');await until('!!document.querySelector(".a-modal")');await evaluate('Array.from(document.querySelectorAll(".a-modal button")).find(b=>b.textContent==="Sign out").click()');stage='logout redirect';await until('location.pathname==="/admin/login"');
 const oldResponse=await fetch(origin+'/api/cab/admin',{headers:{cookie:'cab_ops_session='+testToken}});assert(oldResponse.status===401);checks.push({logout:'server revoked; replay rejected'});
 const[nextUser]=await pool.execute('SELECT user_id FROM users WHERE email=?',[process.env.ADMIN_EMAIL_1]);const expired=security.issueAdminSession('OWNER');await security.registerCabSession(expired,nextUser[0].user_id);await pool.execute('UPDATE cab_admin_sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND) WHERE session_hash=?',[security.hash(expired)]);
 await command('Network.setCookie',{name:'cab_ops_session',value:expired,url:origin,httpOnly:true,sameSite:'Strict',path:'/'});await navigate('/admin/login');await command('Page.navigate',{url:origin+'/admin/packages'});await until('location.pathname==="/admin/login"');await security.revokeCabSession(expired);checks.push({expiredSession:'protected page rejected'});
 assert(errors.length===0,'Browser runtime exceptions detected');await writeFile(folder+'/verification.json',JSON.stringify({checks,loginStatus,runtimeErrors:errors,noBusinessRecordsChanged:true},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,loginStatus,browser:'desktop/tablet/mobile',businessRecordsChanged:false}));
}catch(error){console.error('FAIL Phase 1 browser verification at '+stage+' ('+error.name+'). '+(error.message==='UI state did not become ready'?error.message:'No credentials or session values logged.'));process.exitCode=1;}
finally{if(testToken)await security.revokeCabSession(testToken);await pool.end();if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));ws.close();}browser.kill();}
