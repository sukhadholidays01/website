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
    errors.push(
      m.params.exceptionDetails.exception?.description ??
        m.params.exceptionDetails.text,
    );
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
    throw Error(
      m.result.exceptionDetails.exception?.description ??
        m.result.exceptionDetails.text,
    );
  return m.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (value, message) => {
  if (!value) throw Error(message);
};
const wait = async (expression) => {
  for (let i = 0; i < 100; i++) {
    if (await ev(expression)) return;
    await sleep(100);
  }
  throw Error("Timed out: " + expression);
};
const click = async (text) => {
  await ev(
    `(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.getClientRects().length>0&&(${JSON.stringify(text)}==='Filters'?e.classList.contains('bus-filter-trigger'):e.textContent.trim()===${JSON.stringify(text)}));if(!e)throw Error('Missing visible button: '+${JSON.stringify(text)});e.click()})()`,
  );
  await sleep(250);
};
const input = async (selector, value) => {
  await ev(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`,
  );
  await sleep(150);
};
const select = async (selector, value) => {
  await ev(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  );
  await sleep(200);
};
const visible = (selector) =>
  ev(
    `(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getClientRects().length>0);return e?{disabled:e.disabled,text:e.textContent}:null})()`,
  );
await send("Runtime.enable");
await send("Page.enable");
await send("Page.addScriptToEvaluateOnNewDocument", {
  source:
    "localStorage.setItem('sukhad-holidays-account-prompt-dismissed','true')",
});
const reports = [];
const nav = async (width) => {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 950,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  await send("Page.navigate", { url: "http://localhost:3001/bus" });
  await wait(
    'document.readyState==="complete" && !!document.querySelector(".bus-search-console")',
  );
  await sleep(600);
};
const report = async (width, stage) => {
  await sleep(300);
  const r = await ev(
    `({width:innerWidth,stage:${JSON.stringify(stage)},overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.querySelectorAll('.bus-experience img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),seatTargets:[...document.querySelectorAll('.bus-seat')].filter(e=>{const r=e.getBoundingClientRect();return r.width<44||r.height<44}).length})`,
  );
  assert(!r.overflow, "Overflow " + width + " " + stage);
  assert(!r.broken.length, "Broken images " + JSON.stringify(r));
  assert(r.seatTargets === 0, "Small seat touch targets");
  reports.push(r);
  console.log(JSON.stringify(r));
};
const shot = async (width, stage) => {
  await ev(
    "Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))",
  );
  await sleep(350);
  const m = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  fs.writeFileSync(
    `artifacts/bus/${stage}-${width}.png`,
    Buffer.from(m.result.data, "base64"),
  );
  await report(width, stage);
};
const pickSeat = async (seat) => {
  await ev(
    `document.querySelector('.bus-seat[aria-label^="Berth ${seat},"],.bus-seat[aria-label^="Seat ${seat},"]').click()`,
  );
  await sleep(450);
};
for (const width of [1440, 1280, 768, 360, 375, 390, 430]) {
  await nav(width);
  await shot(width, "search");
  const started = Date.now();
  await click("Search Buses");
  await wait('!!document.querySelector(".bus-loading")');
  assert(
    await ev('!document.querySelector(".bus-search-console")'),
    "Exclusive search animation",
  );
  if (width === 1440) {
    const m = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      "artifacts/bus/search-animation.png",
      Buffer.from(m.result.data, "base64"),
    );
  }
  await wait('document.querySelectorAll(".bus-card").length===8');
  assert(Date.now() - started >= 700, "Search animation duration");
  await shot(width, "results");
  assert(
    await ev(
      '!document.querySelector(".bus-search-console")&&!document.querySelector(".bus-seats")',
    ),
    "Exclusive result state",
  );
  await click("Select Seat");
  await wait('!!document.querySelector(".bus-seats")');
  assert(
    await ev('!document.querySelector(".bus-card")'),
    "Exclusive seat state",
  );
  assert(
    (await visible(".bus-continue,.bus-mobile-seat-footer button")).disabled,
    "Continue disabled without seats",
  );
  await ev('document.querySelector(".bus-seat.unavailable").click()');
  assert(
    await ev('document.querySelectorAll(".bus-seat.selected").length===0'),
    "Unavailable seat guard",
  );
  await pickSeat("01");
  assert(
    (await visible(".bus-continue,.bus-mobile-seat-footer button")).disabled,
    "Continue disabled with only one of two seats",
  );
  await pickSeat("02");
  assert(
    !(await visible(".bus-continue,.bus-mobile-seat-footer button")).disabled,
    "Continue enabled with correct seats",
  );
  assert(
    await ev(
      'document.querySelector(".bus-total strong").textContent.replace(/[^0-9]/g,"")==="1798"',
    ),
    "Fare updates",
  );
  await pickSeat("03");
  assert(
    await ev('document.querySelectorAll(".bus-seat.selected").length===2'),
    "Traveller seat limit",
  );
  await shot(width, "seats");
  await click("Continue");
  await wait('!!document.querySelector(".bus-enquiry-console")');
  await shot(width, "enquiry");
  assert(
    await ev('!document.querySelector(".bus-seats")'),
    "Exclusive enquiry state",
  );
  await input("#bus-passenger-name", "Demo Traveller");
  await input("#bus-passenger-mobile", "9876543210");
  await input("#bus-passenger-email", "demo@example.com");
  await ev('document.querySelector(".bus-consent input").click()');
  await click("Send Enquiry");
  await wait('!!document.querySelector(".bus-success")');
  assert(
    await ev(
      'document.querySelector(".bus-success-reference strong").textContent.startsWith("SH-BUS-")',
    ),
    "Demo success reference",
  );
  assert(
    await ev('!document.querySelector(".bus-enquiry-console")'),
    "Exclusive success state",
  );
  await shot(width, "success");
  await click("Back to Buses");
  await wait('!!document.querySelector(".bus-search-console")');
}
// Desktop filters, real sort orders and back-navigation preservation.
await nav(1440);
await click("Search Buses");
await wait('document.querySelectorAll(".bus-card").length===8');
await ev(
  `(()=>{const e=[...document.querySelectorAll('.bus-filter-desktop label')].find(e=>e.textContent.trim()==='Sleeper');e.querySelector('input').click()})()`,
);
await wait('document.querySelectorAll(".bus-card").length===3');
assert(
  await ev(
    '[...document.querySelectorAll(".bus-card-tags span:first-child")].every(e=>e.textContent.includes("Sleeper")&&!e.textContent.includes("Semi"))',
  ),
  "Bus type filter",
);
await click("Reset");
await ev(
  `(()=>{const e=[...document.querySelectorAll('.bus-filter-desktop label')].find(e=>e.textContent.trim()==='Non AC');e.querySelector('input').click()})()`,
);
await wait('document.querySelectorAll(".bus-card").length===2');
await click("Reset");
await ev(
  `(()=>{const e=[...document.querySelectorAll('.bus-filter-desktop label')].find(e=>e.textContent.startsWith('Afternoon'));e.querySelector('input').click()})()`,
);
await wait('document.querySelectorAll(".bus-card").length===1');
await click("Reset");
await input(".bus-filter-desktop input[type=range]", "750");
await wait('document.querySelectorAll(".bus-card").length===2');
await click("Reset");
for (const [order, expected] of [
  ["price", "649"],
  ["duration", "22:45"],
  ["departure", "06:15"],
]) {
  await select('[aria-label="Sort buses"]', order);
  assert(
    await ev(
      order === "price"
        ? `document.querySelector('.bus-card-fare strong').textContent.replace(/[^0-9]/g,'')==='${expected}'`
        : `document.querySelector('.bus-time strong').textContent==='${expected}'`,
    ),
    "Sort " + order,
  );
}
await select('[aria-label="Sort buses"]', "recommended");
await click("Select Seat");
await wait('!!document.querySelector(".bus-seats")');
await pickSeat("01");
await pickSeat("02");
await click("Continue");
await wait('!!document.querySelector(".bus-enquiry-console")');
await click("Back to seats");
await wait('!!document.querySelector(".bus-seats")');
assert(
  await ev('document.querySelectorAll(".bus-seat.selected").length===2'),
  "Seats preserved on back",
);
await click("Back to buses");
await wait('!!document.querySelector(".bus-card")');
await click("Modify Search");
await wait('!!document.querySelector(".bus-search-console")');
assert(
  await ev('document.querySelector("[aria-label=Travellers]").value==="2"'),
  "Search preserved",
);
// Mobile filter draft/apply/cancel, keyboard focus and a seated coach.
await nav(390);
await click("Search Buses");
await wait('!!document.querySelector(".bus-card")');
await click("Filters");
await wait('document.querySelector(".bus-filter-sheet").open');
assert(
  await ev(
    'document.querySelector(".bus-filter-sheet").contains(document.activeElement)',
  ),
  "Dialog initial focus",
);
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Tab",
  code: "Tab",
  windowsVirtualKeyCode: 9,
});
assert(
  await ev(
    'document.querySelector(".bus-filter-sheet").contains(document.activeElement)',
  ),
  "Dialog keyboard navigation",
);
await ev(
  `(()=>{const e=[...document.querySelectorAll('dialog label')].find(e=>e.textContent.trim()==='Seater');e.querySelector('input').click()})()`,
);
assert(
  await ev('document.querySelectorAll(".bus-card").length===8'),
  "Filters draft does not apply early",
);
await shot(390, "filters");
await click("Apply Filters");
await wait('document.querySelectorAll(".bus-card").length===3');
await click("Filters");
await wait('document.querySelector(".bus-filter-sheet").open');
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Escape",
  code: "Escape",
  windowsVirtualKeyCode: 27,
});
await sleep(200);
assert(
  await ev('!document.querySelector(".bus-filter-sheet").open'),
  "Escape closes filter sheet",
);
await click("Select Seat");
await wait('!!document.querySelector(".bus-seats")');
await shot(390, "seater-map");
await ev('document.querySelector(".bus-seat.available").focus()');
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Enter",
  code: "Enter",
  windowsVirtualKeyCode: 13,
  nativeVirtualKeyCode: 13,
  text: "\r",
  unmodifiedText: "\r",
});
await sleep(200);
assert(
  await ev('document.querySelectorAll(".bus-seat.selected").length===1'),
  "Seat keyboard activation",
);
await send("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "Enter",
  code: "Enter",
  windowsVirtualKeyCode: 13,
});
await click("Back to buses");
await wait('!!document.querySelector(".bus-card")');
await click("Modify Search");
await wait('!!document.querySelector(".bus-search-console")');
await select('[aria-label="From"]', "Jaipur");
await select('[aria-label="To"]', "Lucknow");
await click("Search Buses");
await wait('!!document.querySelector(".bus-empty")');
assert(
  await ev(
    'document.querySelector(".bus-empty h3").textContent.includes("No demo")',
  ),
  "Unsupported route empty state",
);
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await nav(375);
await click("Search Buses");
await wait('!!document.querySelector(".bus-card")');
assert(
  await ev('matchMedia("(prefers-reduced-motion: reduce)").matches'),
  "Reduced motion",
);
const routes = [];
for (const route of [
  "/bus",
  "/",
  "/flights",
  "/holidays",
  "/holidays/ayodhya",
  "/holidays/ayodhya-essentials",
  "/cabs",
  "/taxi",
]) {
  const r = await fetch("http://localhost:3001" + route);
  assert(r.status === 200, "Route " + route);
  routes.push({ route, status: r.status });
  console.log(route, r.status);
}
assert(!errors.length, JSON.stringify(errors));
fs.writeFileSync(
  "artifacts/bus/browser-report.json",
  JSON.stringify({ reports, routes, errors, interactions: "passed" }, null, 2),
);
console.log("All Phase D browser checks passed");
ws.close();



