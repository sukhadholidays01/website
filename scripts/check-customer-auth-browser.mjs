import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import WebSocket from "next/dist/compiled/ws/index.js";
import { runCustomerAuthChecks } from "./check-customer-auth.mjs";

await runCustomerAuthChecks(async fixture=>{
  const origin="http://localhost:3000",browserEmail=fixture.email.replace("@","-browser@"),password=fixture.password;
  const executable=["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
  assert(executable,"Local Chrome or Edge is required.");
  const profile=await mkdtemp(path.join(os.tmpdir(),"sukhad-customer-qa-"));
  const browser=spawn(executable,["--headless=new","--disable-gpu","--remote-debugging-port=0","--remote-debugging-address=127.0.0.1","--no-first-run",`--user-data-dir=${profile}`,"about:blank"],{windowsHide:true,stdio:"ignore"});
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let ws,stage="startup",sequence=0,registered=0;const pending=new Map(),errors=[];
  try {
    let port;for(let i=0;i<100;i++){try{port=(await readFile(path.join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0];break;}catch{await sleep(150);}}assert(port);
    const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();ws=new WebSocket(tabs.find(t=>t.type==="page").webSocketDebuggerUrl);await new Promise(resolve=>ws.once("open",resolve));
    const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error("Browser command timed out"));},90000);pending.set(id,message=>{clearTimeout(timer);resolve(message);});ws.send(JSON.stringify({id,method,params}));});
    ws.on("message",raw=>{const message=JSON.parse(raw);if(message.id){pending.get(message.id)?.(message);pending.delete(message.id);}if(message.method==="Runtime.exceptionThrown")errors.push(message.params.exceptionDetails.text);
      if(message.method==="Fetch.requestPaused")void(async()=>{
        try {registered++;const body=JSON.parse(message.params.request.postData);assert.equal(body.email,browserEmail);const result=await fixture.load("src/lib/auth/customer").registerCustomer(body);await command("Fetch.fulfillRequest",{requestId:message.params.requestId,responseCode:202,responseHeaders:[{name:"Content-Type",value:"application/json"}],body:Buffer.from(JSON.stringify(result)).toString("base64")});}
        catch{await command("Fetch.fulfillRequest",{requestId:message.params.requestId,responseCode:503,responseHeaders:[{name:"Content-Type",value:"application/json"}],body:Buffer.from(JSON.stringify({error:"Test registration failed."})).toString("base64")});}
      })();
    });
    const evaluate=async expression=>{const result=await command("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(result.result?.exceptionDetails)throw Error("Browser evaluation failed; request details omitted.");return result.result?.result?.value;};
    const until=async expression=>{for(let i=0;i<240;i++){if(await evaluate(expression))return;await sleep(250);}throw Error("Expected UI state was not reached.");};
    const navigate=async url=>{await command("Page.navigate",{url:origin+url});await until("document.readyState==='complete'");await sleep(700);};
    const fill=async(id,value)=>{await evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);};
    await command("Runtime.enable");await command("Page.enable");await command("Network.enable");await command("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await command("Page.addScriptToEvaluateOnNewDocument",{source:"localStorage.setItem('sukhad-holidays-account-prompt-dismissed','true');sessionStorage.setItem('sukhad-announcements-v1',JSON.stringify({dismissed:[],seen:{},closed:true}));"});
    stage="signup validation and registration";await navigate("/signup");await until("!!document.querySelector('#fullName')");
    await fill("fullName","Customer browser QA");await fill("email",browserEmail);await fill("password","weak");await fill("confirmation","different");await evaluate("document.querySelector('.customer-auth-form').requestSubmit()");await until("!!document.querySelector('.customer-auth-error')");
    await fill("password",password);await fill("confirmation",password);await evaluate("document.querySelector('input[name=consent]').click()");
    await command("Fetch.enable",{patterns:[{urlPattern:"*/api/customer/register",requestStage:"Request"}]});
    await evaluate("document.querySelector('.customer-auth-form').requestSubmit()");await until("document.querySelector('.customer-auth-card h1')?.textContent==='Check your inbox.'");assert.equal(registered,1);await command("Fetch.disable");
    assert.equal(await evaluate("fetch('/api/customer/session').then(r=>r.status)"),401);
    stage="email verification";const token=fixture.getVerificationToken();await command("Page.navigate",{url:origin+"/verify-email#token="+token});await until("!!document.querySelector('.customer-auth-submit:not(:disabled)') && location.hash===''");await evaluate("document.querySelector('.customer-auth-submit').click()");await until("document.querySelector('.customer-auth-card h1')?.textContent==='Email verified.'");
    stage="real customer login and session";await navigate("/login?next=%2Fadmin");await fill("email",browserEmail);await fill("password",password);await evaluate("document.querySelector('button[aria-label=\"Show password\"]').click()");assert.equal(await evaluate("document.querySelector('#password').type"),"text");await evaluate("document.querySelector('button[aria-label=\"Hide password\"]').click()");
    await evaluate("document.querySelector('.customer-auth-form').requestSubmit()");await until("location.pathname==='/account' && !!document.querySelector('.customer-profile')");
    const cookie=(await command("Network.getCookies",{urls:[origin]})).result.cookies.find(c=>c.name==="sukhad_customer_session");assert(cookie?.httpOnly&&cookie.sameSite==="Lax");assert(await evaluate("!document.cookie.includes('sukhad_customer_session')"));assert.equal(await evaluate("fetch('/api/customer/admin/customers').then(r=>r.status)"),401);
    stage="logout and protected account";await evaluate("document.querySelector('.customer-auth-submit').click()");await until("location.pathname==='/login'");assert.equal(await evaluate("fetch('/api/customer/session').then(r=>r.status)"),401);await navigate("/account");await until("location.pathname==='/login'");
    stage="admin customer management and notifications";await command("Network.setCookie",{name:"cab_ops_session",value:fixture.adminToken,url:origin,httpOnly:true,sameSite:"Lax"});await navigate("/admin/customers");await until("!!document.querySelector('.customer-admin-filters input')");
    await evaluate(`(()=>{const e=document.querySelector('.customer-admin-filters input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(browserEmail)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(100);await evaluate("document.querySelector('.customer-admin-filters').requestSubmit()");await until("document.querySelectorAll('.customer-admin-table tbody tr').length===1");assert(await evaluate(`document.querySelector('.customer-admin-table').textContent.includes(${JSON.stringify(browserEmail)})`));
    const [accounts]=await fixture.pool.execute("SELECT account_id FROM customer_accounts WHERE email=?",[browserEmail]);const id=accounts[0].account_id;
    await until("!!document.querySelector('.customer-activity summary span')");await evaluate("document.querySelector('.customer-activity summary').click()");await until(`!![...document.querySelectorAll('.customer-activity-panel a')].find(a=>a.getAttribute('href')==='/admin/customers/${id}')`);await evaluate(`[...document.querySelectorAll('.customer-activity-panel a')].find(a=>a.getAttribute('href')==='/admin/customers/${id}').click()`);await until(`location.pathname==='/admin/customers/${id}' && !!document.querySelector('.a-details')`);assert(await evaluate(`document.querySelector('.a-details').textContent.includes(${JSON.stringify(browserEmail)})`));assert.equal(await evaluate("fetch('/api/customer/session').then(r=>r.status)"),401);
    stage="responsive forms and popup";
    for(const width of [1440,1024,768,390,360]){await command("Emulation.setDeviceMetricsOverride",{width,height:950,deviceScaleFactor:1,mobile:width<700});for(const url of ["/login","/signup"]){await navigate(url);await until("!!document.querySelector('.customer-auth-card')");assert(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),`overflow ${width} ${url}`);assert(await evaluate("document.querySelector('.customer-auth-card').getBoundingClientRect().width<=481"),`card width ${width} ${url}`);}}
    await navigate("/");await evaluate("document.querySelector('header button[aria-label*=Login]').click()");await until("!!document.querySelector('dialog[open]')");assert(await evaluate("document.querySelector('dialog').getBoundingClientRect().width<=481 && !document.querySelector('dialog input') && !document.querySelector('dialog img[src*=varanasi]')"));await command("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});await until("!document.querySelector('dialog[open]')");
    await command("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});await navigate("/login");await sleep(200);assert(await evaluate("getComputedStyle(document.querySelector('.customer-auth-card')).transform==='none'"));assert.equal(errors.length,0);
    console.log(JSON.stringify({browserPassed:true,signupWithInterceptedEmail:true,realHttpVerificationLoginLogout:true,secureCookie:true,adminManagementAndActivity:true,responsiveWidths:[1440,1024,768,390,360],popupAndReducedMotion:true,runtimeErrors:errors}));
  } catch(error){throw Error("Browser stage "+stage+": "+error.message);}
  finally{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:"Browser.close"}));ws.close();}browser.kill();browser.unref();}
}).catch(error=>{console.error("FAIL customer browser checks: "+error.message);process.exitCode=1;});


