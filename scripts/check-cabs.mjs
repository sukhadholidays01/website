import fs from "node:fs";
import WebSocket from "next/dist/compiled/ws/index.js";
const tabs = await (await fetch("http://localhost:9224/json/list")).json();
const ws = new WebSocket(
  tabs.find((t) => t.type === "page").webSocketDebuggerUrl,
);
await new Promise((r) => ws.on("open", r));
let id = 0;
const pending = new Map(),
  errors = [];
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
  if (m.result?.exceptionDetails) throw Error(m.result.exceptionDetails.text);
  return m.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (v, m) => {
  if (!v) throw Error(m);
};
const set = async (selector, value) =>
  ev(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
const click = async (text) => {
  assert(
    await ev(
      `(()=>{const e=[...document.querySelectorAll('.cab-page button')].find(e=>e.textContent.trim()===${JSON.stringify(text)});e?.click();return !!e})()`,
    ),
    "button " + text,
  );
  await sleep(150);
};
const shot = async (name) => {
  await ev(
    `document.querySelectorAll('.cab-page img').forEach(i=>i.loading='eager')`,
  );
  await sleep(500);
  const s = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  fs.writeFileSync(
    `artifacts/cabs-${name}.png`,
    Buffer.from(s.result.data, "base64"),
  );
};
await send("Runtime.enable");
await send("Page.enable");
await send("Page.addScriptToEvaluateOnNewDocument", {
  source:
    "localStorage.setItem('sukhad-holidays-account-prompt-dismissed','true')",
});
fs.mkdirSync("artifacts", { recursive: true });
const reports = [];
for (const width of [1280, 768, 360, 375, 390, 430]) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: width < 500,
  });
  await send("Page.navigate", { url: "http://localhost:3000/cabs" });
  await sleep(1800);
  await shot(`${width}-route`);
  await click("Find a Cab");
  assert(
    await ev(`document.body.innerText.includes('Select a travel date')`),
    "missing date validation",
  );
  await set("#travelDate", "2020-01-01");
  await click("Find a Cab");
  assert(
    await ev(
      `document.body.innerText.includes('Travel date cannot be in the past')`,
    ),
    "past date validation",
  );
  await set("#travelDate", "2026-10-12");
  await set("#passengers", "0");
  await click("Find a Cab");
  assert(
    await ev(`document.body.innerText.includes('At least one passenger')`),
    "passenger validation",
  );
  await set("#passengers", "2");
  await set("#destination", "Ayodhya");
  await click("Find a Cab");
  assert(
    await ev(
      `document.body.innerText.includes('Pickup and destination must be different')`,
    ),
    "same location validation",
  );
  await set("#destination", "Varanasi");
  await click("Find a Cab");
  assert(
    await ev(`document.body.innerText.includes('Finding your ride')`),
    "route animation state",
  );
  await sleep(2000);
  assert(
    await ev(
      `document.querySelector('.cab-fare-total strong')?.textContent==='₹3,240'`,
    ),
    "sedan fare",
  );
  for (const [name, price] of [
    ["SUV", "₹4,370"],
    ["Luxury", "₹6,480"],
    ["Tempo Traveller", "₹6,240"],
    ["Sedan", "₹3,240"],
  ]) {
    await click(name);
    await sleep(550);
    assert(
      await ev(
        `document.querySelector('.cab-fare-total strong')?.textContent===${JSON.stringify(price)}`,
      ),
      "fare " + name,
    );
  }
  await shot(`${width}-vehicles`);
  const data = await ev(
    `({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('.cab-page *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').map(e=>e.className).slice(0,10),broken:[...document.querySelectorAll('.cab-page img')].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),sticky:getComputedStyle(document.querySelector('.cab-sticky')).display,carPath:getComputedStyle(document.querySelector('.cab-moving-car')).offsetPath})`,
  );
  assert(data.scrollWidth === width, "overflow " + width);
  assert(data.broken.length === 0, "images " + width);
  reports.push(data);
  await click("Continue to Enquiry");
  await sleep(400);
  await set("#cab-name", "Demo Traveller");
  await set("#cab-mobile", "123");
  await set("#cab-email", "demo@example.com");
  await click("Send Cab Enquiry");
  assert(
    await ev(`document.body.innerText.includes('Enter a valid mobile number')`),
    "contact validation",
  );
  await set("#cab-mobile", "9876543210");
  await click("Send Cab Enquiry");
  await sleep(400);
  assert(
    await ev(
      `document.querySelector('.cab-reference strong')?.textContent.startsWith('SH-CAB-')`,
    ),
    "success",
  );
  await shot(`${width}-success`);
}
await click("Back to Cabs");
await sleep(400);
await set("#travelDate", "2026-10-12");
await click("Swap pickup and drop").catch(() => {});
await ev(
  `document.querySelector('.cab-swap').click();document.querySelector('input[value="round-trip"]').click()`,
);
await click("Find a Cab");
await sleep(2000);
assert(
  await ev(
    `document.querySelector('.cab-fare-total strong').textContent==='₹5,880'`,
  ),
  "reverse round trip",
);
await click("Edit journey");
await sleep(400);
await set("#pickup", "Varanasi");
await set("#destination", "Prayagraj");
await click("Find a Cab");
await sleep(2000);
assert(
  await ev(
    `document.querySelector('.cab-unpriced')?.textContent.includes('No demo distance')`,
  ),
  "unsupported route",
);
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await click("Edit journey");
await sleep(400);
await click("Find a Cab");
await sleep(350);
assert(
  await ev(`!!document.querySelector('.cab-vehicle-tabs')`),
  "reduced motion",
);
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Tab",
  code: "Tab",
  windowsVirtualKeyCode: 9,
});
await send("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "Tab",
  code: "Tab",
  windowsVirtualKeyCode: 9,
});
reports.push({ keyboardFocus: await ev(`document.activeElement.textContent`) });
for (const route of ["/", "/flights", "/holidays", "/bus", "/cabs", "/taxi"]) {
  const r = await fetch("http://localhost:3000" + route, {
    redirect: "manual",
  });
  reports.push({
    route,
    status: r.status,
    location: r.headers.get("location"),
  });
  assert(r.status === (route === "/taxi" ? 308 : 200), "route " + route);
}
assert(errors.length === 0, "browser exceptions " + errors.join(","));
fs.writeFileSync(
  "artifacts/cabs-validation.json",
  JSON.stringify({ reports, errors }, null, 2),
);
console.log(JSON.stringify({ reports, errors }, null, 2));
ws.close();
