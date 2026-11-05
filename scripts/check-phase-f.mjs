import fs from 'node:fs';
import WebSocket from 'next/dist/compiled/ws/index.js';
const tab=await(await fetch('http://localhost:9224/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.on('open',r));let id=0;const pending=new Map();const errors=[];
ws.on('message',data=>{const m=JSON.parse(data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description)});
const send=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}))});
const run=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.result?.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result?.result?.value};
const wait=ms=>new Promise(r=>setTimeout(r,ms));await send('Runtime.enable');await send('Page.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{localStorage.setItem('sukhad-holidays-account-prompt-dismissed','true')}catch{}"});
const reports=[];fs.mkdirSync('artifacts/phase-f',{recursive:true});
for(const route of (process.env.PHASEF_ROUTES ? process.env.PHASEF_ROUTES.split(',') : ['/','/flights','/holidays','/holidays/ayodhya','/holidays/ayodhya-essentials','/bus','/cabs','/custom-routes'])){
for(const width of [360,375,390,430,768,1024,1280,1440]){
await send('Page.bringToFront');await send('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<500});await send('Page.navigate',{url:'http://localhost:3001'+route});
for(let i=0;i<100;i++){if(await run(`document.readyState==='complete' && !!document.querySelector('h1')`))break;await wait(150)}
await wait(1400);await run(`(async()=>{for(const img of document.images){img.loading='eager'}await Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,4000))]);window.scrollTo(0,0)})()`);
await run(`(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,70))}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,500))})()`);
const report=await run(`(()=>{const w=innerWidth;return {route:location.pathname,width:w,pageWidth:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src),overflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0 && (r.left < -2 || r.right > w+2) && getComputedStyle(e).position!=='absolute' && !e.closest('[class*=Strip],[class*=strip],[class*=Tabs],[class*=tabs],[class*=gallery],[class*=inspiration],[class*=moods]')}).slice(0,8).map(e=>({tag:e.tagName,cls:e.className}))}})()`);reports.push(report);console.log(JSON.stringify(report));
if([360,1440].includes(width)){const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync('artifacts/phase-f/'+(route==='/'?'home':route.replaceAll('/','-'))+'-'+width+'.png',Buffer.from(shot.result.data,'base64'))}
}}
const redirect=await fetch('http://localhost:3001/taxi',{redirect:'manual'});console.log('taxi',redirect.status,redirect.headers.get('location'));
if(process.env.PHASEF_ROUTES){const previous=JSON.parse(fs.readFileSync('artifacts/phase-f/responsive-report.json','utf8'));for(const old of previous.reports){if(!reports.some(r=>r.route===old.route&&r.width===old.width))reports.push(old)}}
fs.writeFileSync('artifacts/phase-f/responsive-report.json',JSON.stringify({reports,errors,redirect:{status:redirect.status,location:redirect.headers.get('location')}},null,2));console.log('Runtime errors',errors);ws.close();




