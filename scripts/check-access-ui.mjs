import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir,mkdtemp,readFile,writeFile } from "node:fs/promises";
import path from "node:path";
import WebSocket from "next/dist/compiled/ws/index.js";
const origin="http://localhost:3000",folder="artifacts/admin-access-refresh";
const executable=["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
assert(executable,"A local Chrome/Edge installation is required");
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
 const navigate=async url=>{await command("Page.navigate",{url:origin+url});await until(`location.pathname === ${JSON.stringify(url)} && document.readyState === "complete"`);await sleep(1000);};
 const shot=async name=>{const response=await command("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await writeFile(`${folder}/${name}.png`,Buffer.from(response.result.data,"base64"));};
 await command("Runtime.enable");await command("Page.enable");
 for(const width of [1440,820,390]){
  await command("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:width<600});
  for(const url of ["/admin/login","/admin/forgot-password","/admin/reset-password","/cabs"]){
   stage=`${width} ${url}`;
   await navigate(url);await until('!!document.querySelector("h1")');
   if(url==="/cabs")await until('!!document.querySelector(".leaflet-container") || !!document.querySelector(".cb-map-wrap p[role=status]")');
   assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'),"Horizontal overflow");
   if(url==="/admin/login"){
    await until('Object.keys(document.querySelector("form")||{}).some(key=>key.startsWith("__reactProps"))');
    assert(await evaluate('!!document.querySelector("input[autocomplete=username]") && !!document.querySelector("input[type=password]")'));
    await evaluate(`document.querySelector('button[aria-label="Show password"]').click()`);assert(await evaluate('document.querySelector("#admin-password").type === "text"'));
    await evaluate(`document.querySelector('button[aria-label="Hide password"]').click();document.querySelector("form").requestSubmit()`);await until('!!document.querySelector(".sh-auth-field-error")');
    if(width===1440){
      await evaluate(`(()=>{for(const [id,value]of [["admin-email","unknown@example.invalid"],["admin-password","UI-test-password-12345"]]){const input=document.getElementById(id);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));}})()`);
      await evaluate('document.querySelector("form").requestSubmit()');await until('!!document.querySelector(".sh-toast-error") && !document.querySelector(".sh-auth-submit").disabled');
      await evaluate('document.querySelector("form").requestSubmit()');await until('!document.querySelector(".sh-auth-submit").disabled');
      assert(await evaluate('document.querySelectorAll(".sh-toast").length===1 && !document.querySelector(".sh-toast small")'),"Duplicate notifications must not queue");
      await evaluate(`document.querySelector('button[aria-label="Dismiss notification"]').click()`);await until('!document.querySelector(".sh-toast")');
      await command("Input.dispatchKeyEvent",{type:"keyDown",key:"Tab",code:"Tab",windowsVirtualKeyCode:9});assert(await evaluate('["A","INPUT","BUTTON"].includes(document.activeElement.tagName)'));
    }
   }
   if(url==="/admin/reset-password")await until('!!document.querySelector("[role=alert]")');
   if(url==="/cabs"){
    assert(await evaluate('document.querySelectorAll(".cb-steps li").length === 7'));
    const map=await evaluate('({interactive:!!document.querySelector(".leaflet-control-zoom-in"),tiles:document.querySelectorAll(".leaflet-tile-loaded").length})');
    if(map.interactive){await evaluate('document.querySelector(".leaflet-control-zoom-in").click();Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Recenter"))?.click()');}
    checks.push({width,page:url,...map});
   }else checks.push({width,page:url});
   await shot(url.split("/").filter(Boolean).join("-")+"-"+width);
  }
 }
 // Walk the actual customer flow as far as review without creating a booking.
 stage="customer booking journey";await command("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await navigate("/cabs");await until('document.querySelectorAll(".cb-tabs button").length > 0');
 await evaluate(`(()=>{const set=(input,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));};const labels=Array.from(document.querySelectorAll(".cb-main-card label"));set(labels.find(l=>l.textContent.includes("Exact pickup")).querySelector("input"),"UI test pickup hotel");set(labels.find(l=>l.textContent.includes("Exact drop")).querySelector("input"),"UI test destination hotel");set(document.querySelector("input[type=datetime-local]"),new Date(Date.now()+3*86400000+330*60000).toISOString().slice(0,16));})()`);
 await evaluate('document.querySelector(".cb-main-card form").requestSubmit()');await until('document.querySelector(".cb-section-top h2")?.textContent.includes("comfort") || !!document.querySelector(".cb-alert")');
 const hasVehicle=await evaluate('!!document.querySelector(".cb-vehicle input:not(:disabled)")');
 if(hasVehicle){
  await evaluate('document.querySelector(".cb-vehicle input:not(:disabled)").click();document.querySelector(".cb-main-card form").requestSubmit()');await until('document.querySelector(".cb-section-top h2")?.textContent.includes("clear view")');
  await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Continue to passenger")).click()');await until('!!document.querySelector("input[autocomplete=name]")');
  await evaluate(`(()=>{const values={name:"UI Test Traveller",tel:"9000000000",email:"ui-test@example.invalid"};for(const [key,value]of Object.entries(values)){const input=document.querySelector('input[autocomplete='+key+']');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));}})()`);
  await evaluate('document.querySelector(".cb-main-card form").requestSubmit()');await until('document.querySelector(".cb-section-top h2")?.textContent.includes("Confirm first")');
  await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Review your request")).click()');await until('document.querySelector(".cb-section-top h2")?.textContent.includes("Everything")');
  assert(await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Send booking request"))?.disabled === true'),"Consent must be required");await shot("cab-review-desktop");checks.push({bookingFlow:"journey-vehicle-fare-passengers-payment-review",submitted:false});
 }else checks.push({bookingFlow:"unavailable-route-or-inventory",submitted:false});
 assert(errors.length===0,"Browser runtime exceptions detected");
 await writeFile(`${folder}/verification.json`,JSON.stringify({checks,runtimeErrors:errors,realBookingCreated:false},null,2));console.log(JSON.stringify({passed:true,responsiveChecks:checks.length,reviewReached:hasVehicle,realBookingCreated:false}));
}catch(error){console.error("FAIL browser UI verification at "+stage+": "+error.message);process.exitCode=1;}
finally{if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:"Browser.close"}));ws.close();}browser.kill();}
