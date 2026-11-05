import fs from "node:fs";
import WebSocket from "next/dist/compiled/ws/index.js";
const tabs = await (await fetch("http://127.0.0.1:9225/json/list")).json();
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
await new Promise((resolve) => ws.on("open", resolve));
let sequence = 0;
const pending = new Map();
ws.on("message", (data) => {
  const message = JSON.parse(data);
  if (message.id) {
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++sequence;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (
    await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
  ).result?.result?.value;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const press = async (key, code, value) => {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: value,
    ...(key === "Enter" ? { text: "\r", unmodifiedText: "\r" } : {}),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: value,
  });
};
const check = async (name, expression) => {
  const passed = await evaluate(expression);
  if (!passed) throw Error(name);
  console.log(name, passed);
  return { name, value: passed };
};
const reports = [];
await send("Page.bringToFront");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await send("Emulation.setDeviceMetricsOverride", {
  width: 360,
  height: 950,
  deviceScaleFactor: 1,
  mobile: true,
});
await send("Page.navigate", { url: "http://localhost:3000/flights" });
await pause(2000);
await evaluate(`document.querySelector('button[type=submit]').focus()`);
await press("Enter", "Enter", 13);
await pause(1500);
reports.push(
  await check(
    "Keyboard search",
    `document.querySelectorAll('article').length===6`,
  ),
);
await evaluate(
  `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Filters').click()`,
);
await pause(300);
for (let i = 0; i < 20; i++) {
  await press("Tab", "Tab", 9);
  if (!(await evaluate(`!!document.activeElement.closest('dialog[open]')`)))
    throw Error("Focus left the filter dialog");
}
reports.push({ name: "Filter keyboard focus trap", value: true });
await press("Escape", "Escape", 27);
reports.push(
  await check(
    "Escape restores filter focus",
    `!document.querySelector('dialog[open]') && document.activeElement.textContent.includes('Filters')`,
  ),
);
await evaluate(
  `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Select Flight')).focus()`,
);
await press("Enter", "Enter", 13);
await pause(500);
reports.push(
  await check(
    "Keyboard select flight",
    `document.body.innerText.includes('Your flight, in detail')`,
  ),
);
for (const state of ["details", "traveller", "success"]) {
  if (state === "traveller") {
    await evaluate(
      `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Continue to Traveller')).click()`,
    );
    await pause(500);
  }
  if (state === "success") {
    await evaluate(
      `(()=>{for(const [name,value] of Object.entries({firstName:'Demo',lastName:'Traveller',mobile:'123',email:'invalid'})){document.querySelector('[name='+name+']').value=value}document.querySelector('[name=consent]').click();document.querySelector('button[type=submit]').click()})()`,
    );
    reports.push(
      await check(
        "Phone and email validation",
        `!document.querySelector('[name=mobile]').checkValidity() && !document.querySelector('[name=email]').checkValidity()`,
      ),
    );
    await evaluate(
      `document.querySelector('[name=mobile]').value='9876543210';document.querySelector('[name=email]').value='demo@example.com';document.querySelector('[name=consent]').click();document.querySelector('button[type=submit]').click()`,
    );
    reports.push(
      await check(
        "Consent is required",
        `!document.querySelector('[name=consent]').checkValidity() && document.body.innerText.includes('Complete your enquiry')`,
      ),
    );
    await evaluate(
      `document.querySelector('[name=consent]').click();document.querySelector('button[type=submit]').click()`,
    );
    await pause(500);
  }
  reports.push(
    await check(
      `Mobile ${state} overflow`,
      `document.documentElement.scrollWidth<=innerWidth`,
    ),
  );
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  fs.writeFileSync(
    `artifacts/flights-mobile-${state}.png`,
    Buffer.from(screenshot.result.data, "base64"),
  );
}
const report = JSON.parse(
  fs.readFileSync("artifacts/flights-browser-report.json", "utf8"),
);
report.report.push(...reports);
fs.writeFileSync(
  "artifacts/flights-browser-report.json",
  JSON.stringify(report, null, 2),
);
ws.close();
