import fs from "node:fs";
import WebSocket from "next/dist/compiled/ws/index.js";
const tabs = await (await fetch("http://localhost:9226/json/list")).json();
const ws = new WebSocket(
  tabs.find((t) => t.type === "page").webSocketDebuggerUrl,
);
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
  if (m.result?.exceptionDetails) throw Error(m.result.exceptionDetails.text);
  return m.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (b, m) => {
  if (!b) throw Error(m);
};
const wait = async (exp) => {
  for (let i = 0; i < 100; i++) {
    if (await ev(exp)) return;
    await sleep(250);
  }
  throw Error("Timed out " + exp);
};
await send("Runtime.enable");
await send("Page.enable");
await send("Page.addScriptToEvaluateOnNewDocument", {
  source:
    "localStorage.setItem('sukhad-holidays-account-prompt-dismissed','true')",
});
const reports = [];
const nav = async (path, width = 1440) => {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 950,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await send("Page.navigate", { url: "http://localhost:3000" + path });
  await wait(
    'document.readyState==="complete" && !!document.querySelector(".holiday-root")',
  );
  await sleep(700);
};
const shot = async (name) => {
  await ev(
    '(async()=>{document.querySelectorAll("img").forEach(i=>i.loading="eager");for(let y=0;y<document.documentElement.scrollHeight;y+=800){scrollTo(0,y);await new Promise(r=>setTimeout(r,70))}scrollTo(0,0)})()',
  );
  await sleep(1200);
  const m = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  fs.writeFileSync(
    "artifacts/" + name + ".png",
    Buffer.from(m.result.data, "base64"),
  );
};
const click = async (text) => {
  await ev(
    `(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.getClientRects().length>0 && e.textContent.trim().endsWith(${JSON.stringify(text)}));if(!e)throw Error('Missing button');e.click()})()`,
  );
  await sleep(350);
};
const set = async (selector, value) => {
  await ev(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`,
  );
  await sleep(250);
};
for (const width of process.env.HOLIDAY_INTERACTIONS_ONLY ? [] : [1440, 360, 375, 390, 430])
  for (const path of [
    "/holidays",
    "/holidays/ayodhya",
    "/holidays/ayodhya-essentials",
  ]) {
    await nav(path, width);
    await shot("holidays-" + width + "-" + path.split("/").pop());
    const report = await ev(
      `({path:location.pathname,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.querySelectorAll('.holiday-root img')].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)})`,
    );
    reports.push(report);
    assert(!report.overflow, "Overflow " + path + " " + width);
    assert(!report.broken.length, "Broken photos " + JSON.stringify(report));
    console.log(JSON.stringify(report));
  }
await nav("/holidays");
await click("World");
assert(
  await ev(
    'document.querySelector(".holiday-destination h3").textContent==="Dubai"',
  ),
  "World switch",
);
await click("India");
await set(".holiday-search input", "Ayodhya");
assert(
  await ev('document.querySelectorAll(".holiday-destination").length===1'),
  "Search",
);
await set(".holiday-search input", "");
await ev(`document.querySelector('button[aria-pressed=false]').textContent`);
await click("Spiritual");
assert(
  await ev(
    '[...document.querySelectorAll(".holiday-destination h3")].every(e=>["Ayodhya","Varanasi","Rishikesh"].includes(e.textContent))',
  ),
  "Mood",
);
await nav("/holidays/ayodhya");
await ev(
  `(()=>{const e=[...document.querySelectorAll('.holiday-filters select')][0];e.value='short';e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
);
await sleep(200);
assert(
  await ev('document.querySelectorAll(".holiday-package").length===2'),
  "Duration filter",
);
await nav("/holidays/ayodhya-essentials", 390);
await click("Send Enquiry");
assert(
  await ev('document.querySelector(".holiday-sheet").open'),
  "Mobile sheet",
);
assert(await ev('document.querySelector(".holiday-sheet").contains(document.activeElement)'), "Dialog initial focus");
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
assert(await ev('document.querySelector(".holiday-sheet").contains(document.activeElement)'), "Dialog keyboard navigation");
await set("dialog input[name=name]", "Demo Traveller");
await set("dialog input[name=mobile]", "9876543210");
await set("dialog input[name=email]", "demo@example.com");
await set("dialog input[name=date]", "2026-12-10");
await ev(
  'document.querySelector("dialog .holiday-consent input").click();document.querySelector("dialog form").requestSubmit()',
);
await sleep(300);
assert(
  await ev(
    'document.querySelector("dialog .holiday-reference").textContent.startsWith("SH-HOL-")',
  ),
  "Enquiry success",
);
await shot("holidays-mobile-success");
await ev(
  'document.querySelector(".holiday-sheet").dispatchEvent(new Event("cancel"))',
);
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Escape",
  code: "Escape",
  windowsVirtualKeyCode: 27,
});
await ev('document.querySelector(".holiday-gallery button").click()');
await sleep(200);
assert(await ev('document.querySelector(".holiday-lightbox").open'), "Gallery");
await click("Next →");
assert(await ev('document.querySelector(".holiday-dialog-top p").textContent.includes("2 /")'), "Gallery next photo");
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Escape",
  code: "Escape",
  windowsVirtualKeyCode: 27,
});
await sleep(200);
assert(await ev('!document.querySelector(".holiday-lightbox").open'), "Gallery Escape closes");
await ev('document.querySelector(".holiday-gallery").scrollLeft = 340');
assert(await ev('document.querySelector(".holiday-gallery").scrollLeft > 0 && document.documentElement.scrollWidth === innerWidth'), "Mobile swipe gallery");
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await nav("/holidays", 375);
await click("World");
assert(
  await ev('matchMedia("(prefers-reduced-motion: reduce)").matches'),
  "Reduced motion",
);
for (const route of [
  "/",
  "/flights",
  "/bus",
  "/cabs",
  "/taxi",
  "/holidays/varanasi-essentials",
  "/holidays/jaipur-essentials",
  "/holidays/goa-slow-escape",
  "/holidays/dubai-slow-escape",
  "/holidays/bali-slow-escape",
]) {
  const r = await fetch("http://localhost:3000" + route);
  assert(r.status === 200, "Route " + route + " " + r.status);
  console.log(route, r.status);
}
fs.writeFileSync(
  "artifacts/holiday-browser-report.json",
  JSON.stringify({ reports, errors, interactions: "passed" }, null, 2),
);
assert(errors.length === 0, JSON.stringify(errors));
console.log("All holiday browser checks passed");
ws.close();
