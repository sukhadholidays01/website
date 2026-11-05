import fs from 'node:fs';
import WebSocket from 'next/dist/compiled/ws/index.js';
const tab=await(await fetch('http://localhost:9224/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.on('open',r));
let id=0;const pending=new Map();const errors=[];
ws.on('message',data=>{const m=JSON.parse(data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value??a.description).join(' '));if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry.text);});
const send=(method,params={})=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method,params}));});
const run=async expression=>{const reply=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(reply.result?.exceptionDetails)throw new Error(JSON.stringify(reply.result.exceptionDetails));return reply.result?.result?.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Log.enable');await send('Page.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:"try{localStorage.setItem('sukhad-holidays-account-prompt-dismissed','true')}catch{}"});
const reports=[];fs.mkdirSync('artifacts',{recursive:true});
for(const width of [1440,360,375,390,430]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<500});
 await send('Page.navigate',{url:'http://localhost:3000'});
 for(let i=0;i<50;i++){if(await run(`!!document.querySelector('#hero-heading') && !!document.querySelector('#booking button[type=submit]')`))break;await wait(250);}
 await wait(6000);
 for(let attempt=0;attempt<40;attempt++){const n=await run(`document.querySelectorAll("[data-offer-id]").length`);if(n===(width<701?1:3))break;await wait(250);}
 await run(`(async()=>{const images=[...document.images];images.forEach(i=>i.loading='eager');await Promise.all(images.map(i=>i.decode()))})()`);
 const result=JSON.parse(await run(`JSON.stringify((()=>{const button=document.querySelector('#booking button[type=submit]');const icon=button.querySelector('svg');const route=document.querySelector('[data-cab-route="${width<701?'mobile':'desktop'}"]');const r=route.getBoundingClientRect();return {width:innerWidth,pageWidth:document.documentElement.scrollWidth,search:{height:button.getBoundingClientRect().height,width:button.getBoundingClientRect().width,font:getComputedStyle(button).fontSize,iconWidth:icon.getBoundingClientRect().width,iconHeight:icon.getBoundingClientRect().height,stroke:icon.getAttribute('stroke-width')},route:{left:r.left,right:r.right,height:r.height},offers:document.querySelectorAll('[data-offer-id]').length,broken:[...document.images].filter(i=>!i.naturalWidth).length,issues:[...(document.querySelector('nextjs-portal')?.shadowRoot?.querySelectorAll('[data-issues-open]')||[])].map(e=>e.textContent)}})())`));
 console.log(JSON.stringify(result));reports.push(result);
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(`artifacts/polish-${width}.png`,Buffer.from(shot.result.data,'base64'));
 if(width===1440){
   await run(`document.getElementById('discover').scrollIntoView({behavior:'instant'})`);await wait(400);
   console.log('Desktop offers',await run(`JSON.stringify({count:document.querySelectorAll('[data-offer-id]').length,visibility:getComputedStyle(document.querySelector('[data-travel-offers]')).visibility})`));
   const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('artifacts/polish-desktop-offers.png',Buffer.from(shot.result.data,'base64'));
 }
}
await run(`document.querySelector('#discover').scrollIntoView({behavior:'instant'})`);await wait(600);
const first=await run(`document.querySelector('[data-offer-id]')?.dataset.offerId`);await wait(6500);const next=await run(`document.querySelector('[data-offer-id]')?.dataset.offerId`);
console.log('Mobile rotation',JSON.stringify({first,next,count:await run(`document.querySelectorAll('[data-offer-id]').length`)}));
const mobileShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('artifacts/polish-mobile-offer.png',Buffer.from(mobileShot.result.data,'base64'));
const dismissals=[];
for(let i=0;i<3;i++){const offer=await run(`document.querySelector('[data-offer-id]')?.dataset.offerId`);dismissals.push(offer);await run(`document.querySelector('[data-offer-id] button').click()`);await wait(600);}
await send('Page.reload');await wait(6000);const afterReload=await run(`document.querySelectorAll('[data-offer-id]').length`);console.log('Dismissals',JSON.stringify({dismissals,afterReload}));
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await send('Page.reload');await wait(3000);console.log('Reduced motion',await run(`JSON.stringify({animated:document.querySelectorAll('[data-route-car="animated"]').length,static:document.querySelectorAll('[data-route-car="static"]').length})`));
console.log('Runtime errors',JSON.stringify(errors));fs.writeFileSync('artifacts/polish-report.json',JSON.stringify({reports,rotation:{first,next},dismissals,afterReload,errors},null,2));ws.close();
