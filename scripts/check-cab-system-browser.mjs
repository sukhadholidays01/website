import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import WebSocket from "next/dist/compiled/ws/index.js";

export async function checkCabSystemBrowser({ origin, password }) {
  const executable =
    process.env.CAB_TEST_CHROME ||
    [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    ].find(existsSync);
  assert(
    executable,
    "Set CAB_TEST_CHROME to an installed Chrome/Edge executable.",
  );
  await mkdir("artifacts/cab-system/chrome-profile", { recursive: true });
  const profile = await mkdtemp(
    path.resolve("artifacts/cab-system/chrome-profile/run-"),
  );
  const chrome = spawn(
    executable,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      "--remote-debugging-address=127.0.0.1",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--user-data-dir=" + profile,
      "about:blank",
    ],
    { windowsHide: true, stdio: "ignore" },
  );
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let ws;
  let browserEndpoint;
  const errors = [],
    responsive = [];
  try {
    let debugPort;
    for (let i = 0; i < 80; i++) {
      try {
        const raw = await readFile(
          path.join(profile, "DevToolsActivePort"),
          "utf8",
        );
        debugPort = Number(raw.split("\n")[0]);
        if (debugPort) break;
      } catch {}
      await sleep(200);
    }
    assert(debugPort, "Headless browser did not start.");
    browserEndpoint = "http://127.0.0.1:" + debugPort;
    const tabs = await (await fetch(browserEndpoint + "/json/list")).json();
    ws = new WebSocket(
      tabs.find((t) => t.type === "page").webSocketDebuggerUrl,
    );
    await new Promise((resolve, reject) => {
      ws.on("open", resolve);
      ws.on("error", reject);
    });
    let sequence = 0;
    const pending = new Map();
    ws.on("message", (raw) => {
      const m = JSON.parse(raw);
      if (m.id) {
        pending.get(m.id)?.(m);
        pending.delete(m.id);
      }
      if (m.method === "Runtime.exceptionThrown")
        errors.push(
          m.params.exceptionDetails.exception?.description ||
            m.params.exceptionDetails.text,
        );
    });
    const send = (method, params = {}, sessionId) =>
      new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(Error("Browser command timed out: " + method));
        }, 15000);
        pending.set(id, (result) => {
          clearTimeout(timer);
          resolve(result);
        });
        ws.send(JSON.stringify({ id, method, params, ...(sessionId?{sessionId}:{}) }));
      });
    const ev = async (expression) => {
      const m = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (m.result?.exceptionDetails)
        throw Error(
          m.result.exceptionDetails.exception?.description ||
            m.result.exceptionDetails.text,
        );
      return m.result?.result?.value;
    };
    const until = async (expression, label) => {
      for (let i = 0; i < 100; i++) {
        if (await ev(expression)) return;
        await sleep(150);
      }
      throw Error("Browser wait timed out: " + label);
    };
    const click = async (text) => {
      const hit = await ev(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b || b.disabled)return false;b.click();return true;})()`,
      );
      assert(hit, "Clickable button: " + text);
      await sleep(150);
    };
    const set = async (selector, value) => {
      assert(
        await ev(
          `(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`,
        ),
        "Input exists: " + selector,
      );
    };
    const navigate = async (url) => {
      await send("Page.navigate", { url });
      await until('document.readyState === "complete"', "page loaded");
      await sleep(400);
    };
    const screenshot = async (name) => {
      const shot = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      await writeFile(
        `artifacts/cab-system/${name}.png`,
        Buffer.from(shot.result.data, "base64"),
      );
    };
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source:
        "try{localStorage.setItem('sukhad-holidays-account-prompt-dismissed','true')}catch{}",
    });
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1050,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigate(origin + "/cabs");
    await until(
      '!!document.querySelector(".cb-map.leaflet-container")',
      "interactive map",
    );
    const departure = new Date(Date.now() + 5 * 86400000);
    departure.setUTCHours(8, 0, 0, 0);
    const date = new Date(departure.getTime() + 330 * 60000)
      .toISOString()
      .slice(0, 16);
    await set(
      'input[placeholder="Hotel, street address or airport terminal"]',
      "Browser fixture pickup hotel",
    );
    await ev(
      `(()=>{const inputs=[...document.querySelectorAll('input')].filter(e=>e.placeholder==='Hotel, street address or airport terminal');const e=inputs[1];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Browser fixture drop hotel');e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    await set('input[type="datetime-local"]', date);
    await screenshot("journey-desktop");
    await click("Choose your ride");
    await until(
      '!!document.querySelector(".cb-vehicle-grid")',
      "vehicle choice",
    );
    await click("Get fare & continue");
    await until(
      '!!document.querySelector("input[autocomplete=name]")',
      "review",
    );
    assert(
      await ev(
        'document.querySelector(".cb-fare").textContent.includes("3,490")',
      ),
      "Approved fare in review",
    );
    await set('input[autocomplete="name"]', "Browser Fixture Traveller");
    await set('input[autocomplete="tel"]', "9000000003");
    await set('input[autocomplete="email"]', "browser@example.invalid");
    await ev('document.querySelector(".cb-consent input").click()');
    await click("Send booking request");
    await until('!!document.querySelector(".cb-reference")', "saved booking");
    const id = await ev('document.querySelector(".cb-reference").textContent');
    const privateLink = await ev("location.href");
    assert(
      await ev(
        'document.body.textContent.includes("Your request is received.") && document.body.textContent.includes("Pending Review") && document.body.textContent.includes("Development preview.")',
      ),
    );
    await navigate(origin + "/admin/cab-operations");
    await until(
      '!!document.querySelector("input[type=password]")',
      "operations login",
    );
    await set("input[type=password]", password);
    await click("Sign in securely");
    await until(
      '!!document.querySelector(".cb-booking-list")',
      "operations dashboard",
    );
    const openBooking = async () => {
      assert(
        await ev(
          `(()=>{const b=[...document.querySelectorAll('.cb-booking-row')].find(b=>b.textContent.includes(${JSON.stringify(id)}));if(!b)return false;b.click();return true;})()`,
        ),
      );
      await until(
        '!!document.querySelector(".cb-operation-detail")',
        "booking detail",
      );
    };
    await openBooking();
    await set('input[name="amount"]', "4500");
    await set('textarea[name="inclusions"]', "Fuel and driver included");
    await set('textarea[name="exclusions"]', "Tolls and parking extra");
    await click("Send quote to booking page");
    await until(
      'document.querySelector(".cb-operation-detail .cb-status-badge")?.textContent === "QUOTED"',
      "quote issued",
    );
    await navigate(privateLink);
    await until(
      'document.body.textContent.includes("Your quote is ready.")',
      "customer sees quote",
    );
    await ev('document.querySelector(".cb-quote-accept input").click()');
    await click("Accept quote & request confirmation");
    await until(
      'document.body.textContent.includes("Quote accepted. Thank you.")',
      "quote accepted",
    );
    await navigate(origin + "/admin/cab-operations");
    await until(
      '!!document.querySelector(".cb-booking-list")',
      "session retained",
    );
    await openBooking();
    await click("Confirm availability & booking");
    await until(
      'document.querySelector(".cb-operation-detail .cb-status-badge")?.textContent === "CONFIRMED"',
      "booking confirmed",
    );
    await click("Assign ride");
    await set('select[name="driverId"]', "demo-driver-1");

    await set('select[name="vehicleId"]', "demo-vehicle-0");
    await click("Save assignment");
    await until(
      'document.querySelector(".cb-operation-detail .cb-status-badge")?.textContent === "ASSIGNED"',
      "driver assigned",
    );
    await click("Record payment");
    await set('input[name="amount"]', "500");
    await set('input[name="reference"]', "browser-fixture-receipt");
    await set('textarea[name="note"]', "Verified browser fixture receipt");
    await click("Record verified receipt");
    await until(
      'document.body.textContent.includes("Manual receipt recorded: ₹500")',
      "receipt saved",
    );
    await screenshot("operations-desktop");
    await navigate(privateLink);
    await until(
      'document.body.textContent.includes("Demo Driver One")',
      "customer sees assignment",
    );
    assert(
      await ev(
        'document.querySelector(".cb-payment-grid").textContent.includes("4,000")',
      ),
    );
    await screenshot("booking-desktop");
    await click("Start development payment");
    await until(
      '!!document.querySelector(".cb-payment-attempt")',
      "mock payment attempt",
    );
    await click("Simulate failed payment");
    await until(
      'document.querySelector(".cb-payment-attempt .cb-status-badge")?.textContent.includes("FAILED")',
      "failed payment state",
    );
    await click("Start development payment");
    await until(
      '[...document.querySelectorAll(".cb-payment-attempt .cb-status-badge")].some(e=>e.textContent.includes("PENDING"))',
      "retry mock payment",
    );
    await click("Simulate successful payment");
    await until(
      '[...document.querySelectorAll(".cb-payment-attempt .cb-status-badge")].some(e=>e.textContent.includes("SUCCESSFUL"))',
      "successful payment state",
    );
    assert(
      await ev(
        'document.querySelector(".cb-status-hero .cb-eyebrow").textContent.includes("ASSIGNED")',
      ),
    );
    await click("Simulate refund");
    await until(
      '[...document.querySelectorAll(".cb-payment-attempt .cb-status-badge")].some(e=>e.textContent.includes("REFUNDED"))',
      "refunded payment state",
    );
    for (const width of [360, 390, 768, 1440]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: width < 500,
      });
      for (const [label, url] of [
        ["journey", origin + "/cabs"],
        ["booking", privateLink],
        ["operations", origin + "/admin/cab-operations"],
      ]) {
        await navigate(url);
        await until(
          label === "operations"
            ? '!!document.querySelector(".cb-booking-list")'
            : label === "booking"
              ? '!!document.querySelector(".cb-reference")'
              : '!!document.querySelector(".cb-tabs")',
          label,
        );
        const size = await ev(
          "({width:innerWidth,scroll:document.documentElement.scrollWidth})",
        );
        assert(
          size.scroll <= size.width,
          `${label} overflows at ${width}: ${JSON.stringify(size)}`,
        );
        responsive.push({ label, ...size });
        if (width === 360) await screenshot(label + "-mobile");
      }
    }
    await navigate(origin + "/cabs");
    await until(
      '[...document.querySelectorAll(".cb-tabs button")].some(b=>b.textContent.trim()==="Round-trip")',
      "configured trip tabs",
    );
    await click("Round-trip");
    assert(
      await ev(
        'document.querySelectorAll("input[type=datetime-local]").length===2',
      ),
    );
    await click("Airport transfer");
    assert(await ev('!!document.querySelector(".cb-airport-direction")'));
    assert(
      await ev(
        'document.querySelector(".cb-location-grid select").selectedOptions[0].textContent.includes("Airport")',
      ),
    );
    await ev(
      'document.querySelectorAll(".cb-airport-direction input")[1].click()',
    );
    assert(
      await ev(
        'document.querySelectorAll(".cb-location-grid select")[1].selectedOptions[0].textContent.includes("Airport")',
      ),
    );
    await navigate(origin + "/admin/cab-operations");
    await until('!!document.querySelector(".cb-op-tabs")', "operations tabs");
    for (const width of [1440, 360]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: width < 500,
      });
      for (const [tab, heading] of [
        ["Routes & fares", "Routes & fares"],
        ["Vehicles", "Vehicle management"],
        ["Drivers", "Driver management"],
        ["Settings", "Cab settings"],
        ["Email previews", "Email previews & delivery log"],
        ["Source fare sheet", "Original fare-sheet drafts"],
      ]) {
        await click(tab);
        await until(
          `document.body.textContent.includes(${JSON.stringify(heading)})`,
          tab,
        );
        const size = await ev(
          "({width:innerWidth,scroll:document.documentElement.scrollWidth})",
        );
        assert(size.scroll <= size.width, `${tab} overflows at ${width}`);
        responsive.push({ label: tab, ...size });
        if (width === 1440 && tab === "Routes & fares") {
          await ev('document.querySelector(".cb-booking-row").click()');
          await until(
            '!!document.querySelector(".cb-rule-form") || !!document.querySelector(".cb-editor-details")',
            "route editor",
          );
          await click("Preview shared fare calculation");
          await until(
            '!!document.querySelector(".cb-fare")',
            "admin fare preview",
          );
          await screenshot("route-editor-desktop");
        }
        if (tab === "Email previews") {
          await ev('document.querySelector(".cb-booking-row").click()');
          await until(
            '!!document.querySelector("iframe.cb-email-preview")',
            "email rendering",
          );
          assert(
            await ev(
              'document.querySelector("iframe.cb-email-preview").getAttribute("sandbox")===""',
            ),
          );
          await sleep(600);
          const frames=await send('Page.getFrameTree');
          const frame=frames.result.frameTree.childFrames?.find(f=>f.frame.url==='about:srcdoc');
          let rendered;
          if(frame) {
            const world=await send('Page.createIsolatedWorld',{frameId:frame.frame.id,worldName:'email-preview-verification'});
            rendered=await send('Runtime.evaluate',{expression:'document.body.textContent',contextId:world.result.executionContextId,returnByValue:true});
          } else {
            // Empty sandbox creates an out-of-process iframe: inspect its own CDP target,
            // rather than weakening sandbox permissions or assuming an iframe exists in the parent tree.
            const targets=await send('Target.getTargets');
            const target=targets.result.targetInfos.find(t=>t.type==='iframe'&&t.url==='about:srcdoc');
            assert(target,'Isolated sandboxed email target exists');
            const attached=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
            rendered=await send('Runtime.evaluate',{expression:'document.body.textContent',returnByValue:true},attached.result.sessionId);
            await send('Target.detachFromTarget',{sessionId:attached.result.sessionId});
          }
          assert(rendered.result?.result?.value?.includes('Sukhadh Holidays'),'Actual sandboxed email HTML rendered');
          await sleep(200);
          if (width === 1440) await screenshot("email-preview-desktop");
        }
        if (width === 360 && ["Vehicles", "Settings"].includes(tab))
          await screenshot(tab.toLowerCase() + "-mobile");
      }
    }
    assert.equal(
      errors.length,
      0,
      "Browser runtime exceptions: " + errors.join("\n"),
    );
    console.log(
      "PASS browser booking → admin quote → customer acceptance → confirmation → assignment → receipt and responsive layouts",
    );
    return { workflow: "passed", responsive, runtimeErrors: errors };
  } finally {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ id: 999999, method: "Browser.close" }));
      ws.close();
    }
    chrome.kill();
  }
}
