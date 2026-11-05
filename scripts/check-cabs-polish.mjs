import fs from "node:fs";
import WebSocket from "next/dist/compiled/ws/index.js";
const tabs = await (await fetch("http://localhost:9224/json/list")).json();
const ws = new WebSocket(
  tabs.find((t) => t.type === "page").webSocketDebuggerUrl,
);
await new Promise((r) => ws.on("open", r));
let id = 0;
const pending = new Map();
ws.on("message", (data) => {
  const m = JSON.parse(data);
  if (m.id) {
    pending.get(m.id)?.(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
const ev = async (expression) =>
  (
    await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
  ).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (v, m) => {
  if (!v) throw Error(m);
};
const shot = async (name) => {
  const s = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  fs.writeFileSync(
    `artifacts/cabs-polish-${name}.png`,
    Buffer.from(s.result.data, "base64"),
  );
};
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 950,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://localhost:3000/cabs" });
await sleep(1700);
await ev(
  `(()=>{let e=document.querySelector('#travelDate');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'2026-10-12');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
);
await sleep(150);
await ev(`document.querySelector('button[type=submit]').click()`);
await sleep(280);
const first = await ev(
  `getComputedStyle(document.querySelector('.cab-moving-car')).offsetDistance`,
);
await sleep(300);
const second = await ev(
  `getComputedStyle(document.querySelector('.cab-moving-car')).offsetDistance`,
);
console.log({ first, second });
assert(first !== second, "car movement");
await shot("animation");
await sleep(1600);
for (const name of ["Sedan", "SUV", "Luxury", "Tempo Traveller"]) {
  await ev(
    `[...document.querySelectorAll('.cab-vehicle-tabs button')].find(e=>e.textContent==='${name}').click()`,
  );
  await sleep(550);
  await ev(
    `document.querySelector('.cab-vehicle-presentation').scrollIntoView({block:'center',behavior:'instant'})`,
  );
  await sleep(400);
  assert(
    await ev(`!!document.querySelector('.cab-photo-layer img')?.naturalWidth`),
    "image " + name,
  );
  await shot(name.toLowerCase().replaceAll(" ", "-"));
}
await ev(`document.querySelector('.cab-vehicle-tabs button').focus()`);
for (const type of ["keyDown", "keyUp"])
  await send("Input.dispatchKeyEvent", {
    type,
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
assert(await ev(`document.activeElement.textContent==='SUV'`), "keyboard tab");
for (const type of ["keyDown", "keyUp"])
  await send("Input.dispatchKeyEvent", {
    type,
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
    text: type === "keyDown" ? "\r" : "",
  });
await sleep(500);
assert(
  await ev(
    `[...document.querySelectorAll('.cab-vehicle-tabs button')].find(e=>e.textContent==='SUV').getAttribute('aria-pressed')==='true'`,
  ),
  "keyboard select",
);
await send("Emulation.setDeviceMetricsOverride", {
  width: 360,
  height: 800,
  deviceScaleFactor: 1,
  mobile: true,
});
await ev(
  `document.getElementById('cab-fare').scrollIntoView({block:'center',behavior:'instant'})`,
);
await sleep(400);
const sticky = await ev(
  `(()=>{let r=document.querySelector('.cab-sticky').getBoundingClientRect();return {bottom:r.bottom,viewport:innerHeight,width:r.width}})()`,
);
assert(
  Math.abs(sticky.bottom - sticky.viewport) < 1,
  "sticky anchored to viewport",
);
await shot("mobile-fare");
await ev(`document.querySelector('.cab-sticky button').click()`);
await sleep(600);
await shot("mobile-enquiry");
assert(await ev(`document.activeElement.tagName==='H2'`), "enquiry focus");
const report = {
    carMovement: [first, second],
    keyboard: "Tab and Enter select SUV",
    sticky,
    enquiryFocus: true,
};
fs.writeFileSync("artifacts/cabs-polish-validation.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
ws.close();
