import fs from "node:fs";
import WebSocket from "next/dist/compiled/ws/index.js";
const qaTab = await (await fetch("http://localhost:9224/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(qaTab.webSocketDebuggerUrl);
await new Promise((r) => ws.on("open", r));
let id = 0;
const pending = new Map();
const errors = [];
ws.on("message", (data) => {
  const m = JSON.parse(data);
  if (m.id) {
    pending.get(m.id)?.(m);
    pending.delete(m.id);
  }
  if (m.method === "Runtime.exceptionThrown")
    errors.push(m.params.exceptionDetails.exception?.description);
});
const send = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id;
    pending.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const ev = async (expression) => {
  const m = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (m.result?.exceptionDetails)
    throw new Error(m.result.exceptionDetails.text);
  return m.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await ev(expression)) return;
    await sleep(250);
  }
  throw Error(`Timed out waiting for ${expression}`);
};
const click = (text) =>
  ev(
    `(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim().toLowerCase()===${JSON.stringify(text.toLowerCase())});if(!b)throw Error('Missing button: '+${JSON.stringify(text)});b.click()})()`,
  );
const select = (label, value) =>
  ev(
    `(()=>{const e=document.querySelector('select[aria-label="${label}"]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  );
const shot = async (name) => {
  const m = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  fs.writeFileSync(
    `artifacts/flights-${name}.png`,
    Buffer.from(m.result.data, "base64"),
  );
};
const report = [];
const check = async (name, expression) => {
  const value = await ev(expression);
  report.push({ name, value });
  if (!value) throw Error("Failed: " + name);
  console.log(name, value);
};
await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await send("Page.addScriptToEvaluateOnNewDocument", {
  source:
    "localStorage.setItem('sukhad-holidays-account-prompt-dismissed','true')",
});
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3001/flights" });
await sleep(3500);
await shot("desktop-search");
await select("From", "BOM");
await click("Search Flights");
await check(
  "Same airport validation",
  `document.body.innerText.includes('Choose different airports')`,
);
await select("From", "DEL");
await click("Search Flights");
await sleep(350);
await check(
  "Search animation",
  `document.body.innerText.includes('Finding flights')`,
);
await sleep(1300);
await check(
  "Round trip results",
  `document.querySelectorAll('article').length===6 && document.querySelector('article').innerText.includes('Onward')`,
);
await shot("desktop-results");
await select("Sort flights", "price");
await sleep(200);
await check(
  "Price sorts",
  `(()=>{const a=[...document.querySelectorAll('article')].map(e=>Number(e.querySelector('.text-xl').textContent.replace(/[^0-9]/g,''))); return a.every((n,i)=>!i||n>=a[i-1])})()`,
);
await select("Sort flights", "duration");
await check(
  "Duration sorts",
  `(()=>{const values=[...document.querySelectorAll('article')].map(e=>[...e.querySelectorAll('p')].filter(p=>/^\\d+h \\d+m$/.test(p.textContent)).reduce((n,p)=>{const [h,m]=p.textContent.match(/\\d+/g).map(Number);return n+h*60+m},0));return values.every((n,i)=>!i||n>=values[i-1])})()`,
);
await select("Sort flights", "departure");
await check(
  "Departure sorts",
  `(()=>{const values=[...document.querySelectorAll('article')].map(e=>[...e.querySelectorAll('p')].find(p=>/^\\d{2}:\\d{2}$/.test(p.textContent)).textContent);return values.every((n,i)=>!i||n>=values[i-1])})()`,
);
await select("Sort flights", "recommended");
await check(
  "Recommended sorts",
  `document.querySelector('article').innerText.includes('6E 140')`,
);
await ev(`document.querySelector('input[value="0"]').click()`);
await sleep(200);
await check("Stops filters", `document.querySelectorAll('article').length===4`);
await ev(`document.querySelector('aside input[type="checkbox"]').click()`);
await sleep(200);
await check(
  "Airline filters",
  `document.querySelectorAll('article').length===2`,
);
await click("Reset");
await sleep(100);
await ev(
  `(()=>{const e=document.querySelector('input[type=range]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'0');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
);
await sleep(200);
await check(
  "Price empty state",
  `document.body.innerText.includes('No options match')`,
);
await click("Clear filters");
await select("Departure time", "afternoon");
await sleep(200);
await check(
  "Departure filter",
  `document.querySelectorAll('article').length===2`,
);
await click("Reset");
await click("Select Flight");
await sleep(500);
await check(
  "Flight details",
  `document.body.innerText.includes('Your flight, in detail') && document.body.innerText.includes('Fare summary')`,
);
await click("Back to results");
await sleep(500);
await select("Sort flights", "price");
await ev(`document.querySelector('input[value="0"]').click()`);
await click("Select Flight");
await sleep(500);
await click("Back to results");
await sleep(500);
await check(
  "Back preserves filters and sort",
  `document.querySelectorAll('article').length===4 && document.querySelector('[aria-label="Sort flights"]').value==='price'`,
);
await click("Select Flight");
await sleep(500);
await shot("desktop-details");
await click("Continue to Traveller Details");
await sleep(500);
await shot("desktop-enquiry");
await click("Send Enquiry");
await check("Required validation", `!!document.querySelector('input:invalid')`);
await ev(
  `(()=>{for(const [name,value] of Object.entries({firstName:'Demo',lastName:'Traveller',mobile:'9876543210',email:'demo@example.com'})){const e=document.querySelector('[name='+name+']');e.value=value;}document.querySelector('[name=consent]').click()})()`,
);
await click("Send Enquiry");
await sleep(500);
await check(
  "Success is demo",
  `document.body.innerText.includes('Enquiry received') && document.body.innerText.includes('No enquiry was transmitted')`,
);
await shot("success");
await click("Back to Flights");
await sleep(500);
await click("One Way");
await check(
  "One way hides return",
  `!document.querySelector('input[aria-label=Return]')`,
);
await click("International");
await click("Search Flights");
await sleep(1600);
await check(
  "International options",
  `document.querySelectorAll('article').length===6 && document.querySelector('article').innerText.includes('DXB')`,
);
await click("Modify Search");
await sleep(500);
await click("Domestic");
await click("Multi City");
await check(
  "Multi city has second leg",
  `!!document.querySelector('select[aria-label="City 3"]')`,
);
await click("Search Flights");
await sleep(1600);
await check(
  "Multi city results",
  `document.querySelectorAll('article').length===6 && document.querySelector('article').innerText.includes('Onward')`,
);
await click("Modify Search");
await sleep(500);
await select("City 3", "GOX");
await click("Search Flights");
await sleep(1600);
await check(
  "Unsupported route honest empty",
  `document.body.innerText.includes('isn’t in our demo collection')`,
);
for (const width of [360, 375, 390, 430, 768, 1280]) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 950,
    deviceScaleFactor: 1,
    mobile: width < 500,
  });
  await send("Page.navigate", { url: "http://localhost:3001/flights" });
  await sleep(1500);
  await shot(`search-${width}`);
  await check(
    `Search overflow ${width}`,
    `document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.flight-experience input,.flight-experience select,.flight-experience button')].every(e=>{const r=e.getBoundingClientRect();return !r.width || (r.left>=0 && r.right<=innerWidth)})`,
  );
  await click("Search Flights");
  await waitFor(`document.querySelectorAll('article').length===6`);
  await sleep(250);
  await shot(`results-${width}`);
  await check(
    `Results overflow ${width}`,
    `document.documentElement.scrollWidth<=innerWidth`,
  );
  if (width < 768) {
    await click("Filters");
    await sleep(300);
    await check(
      `Filter modal ${width}`,
      `document.querySelector('dialog[open]').getAttribute('aria-labelledby')==='filter-title'`,
    );
    await shot(`filters-${width}`);
    await ev(`document.querySelector('dialog[open] input[value="0"]').click()`);
    await click("Apply Filters");
    await sleep(200);
    await check(
      `Mobile filters apply ${width}`,
      `document.querySelectorAll('article').length===4 && !document.querySelector('dialog[open]')`,
    );
    await click("Filters");
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await check(
      `Escape returns focus ${width}`,
      `!document.querySelector('dialog[open]') && document.activeElement.textContent.includes('Filters')`,
    );
  }
}
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await send("Page.navigate", { url: "http://localhost:3001/flights" });
await sleep(1500);
await click("Search Flights");
await sleep(400);
await check(
  "Reduced motion quick results",
  `document.querySelectorAll('article').length===6`,
);
for (const path of ["/", "/holidays", "/bus", "/cabs", "/taxi"]) {
  const response = await fetch("http://localhost:3001" + path, {
    redirect: "manual",
  });
  report.push({
    name: `Route ${path}`,
    status: response.status,
    location: response.headers.get("location"),
  });
  console.log(path, response.status, response.headers.get("location"));
}
fs.writeFileSync(
  "artifacts/flights-browser-report.json",
  JSON.stringify({ report, errors }, null, 2),
);
console.log("Browser errors", errors);
ws.close();


