import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import WebSocket from 'next/dist/compiled/ws/index.js';
import { serverModuleLoader } from './server-module-loader.mjs';
import dotenv from 'dotenv';
let liveRoute;
if(process.argv.includes('--live-route')) {
 const config = {...dotenv.parse(await readFile('.env.development','utf8')),...dotenv.parse(await readFile('.env.local','utf8'))};
 const saved = {...process.env}; Object.assign(process.env,config);
 const real = serverModuleLoader(); const places=real('src/data/cabPlaces').cabPlaces;
 try { liveRoute=await real('src/lib/cab/routing').roadLeg(places[0],places[1]); console.log('Live road preview verified: '+liveRoute.distanceKm+' km, '+liveRoute.durationMinutes+' minutes'); } finally { for(const key of Object.keys(process.env)) if(!(key in saved)) delete process.env[key];Object.assign(process.env,saved); }
}


// Real React UI + existing domain services in memory. HTTP/auth/persistence boundaries
// are intercepted: no real customer records, email, payments or database connections.
process.env.NODE_ENV = 'development';
process.env.CAB_STORAGE_MODE = 'memory';
process.env.CAB_ROUTING_PROVIDER = 'demo';
process.env.CAB_EMAIL_MODE = 'preview';
process.env.CAB_EMAIL_SEND_ENABLED = 'false';
const mapboxMode = process.argv.includes('--mapbox');
process.env.CAB_SESSION_SECRET = 'isolated-browser-map-signing-secret';
const mapboxFixture = { label: 'Sector 62, Noida, India', name: 'Sector 62', context: 'Noida, Uttar Pradesh, India', city: 'Noida', lat: 28.627, lon: 77.365, featureType: 'locality', accuracy: 'approximate', airport: false };
if (mapboxMode) {
  process.env.CAB_GEOCODING_PROVIDER = 'mapbox';
  process.env.NEXT_PUBLIC_CAB_MAPBOX_TOKEN = 'pk.synthetic-map-test-only';
}
const load = serverModuleLoader({ '@/lib/db': { getDatabasePool: () => ({ execute: async sql => {
  assert(sql.includes("setting_key='cab_guest_policy'"), 'Unexpected database call'); return [[]];
} }) }, ...(mapboxMode ? { './mapbox-geocoding': { mapboxSearchEnabled: () => true, requireMapboxGeocoding() {}, mapboxForward: async query => [{ ...mapboxFixture, name: query.startsWith('Fast') ? 'Fast new street' : mapboxFixture.name }], inIndiaBounds: (lat, lon) => lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98 } } : {}) });
const maps = load('src/lib/cab/maps');
const service = load('src/lib/cab/service');
const operations = load('src/lib/cab/operations');
await load('src/lib/cab/store').changeCabState(state => { state.operations.settings.enabledTripTypes = ['one-way', 'round-trip', 'airport', 'custom', 'multi-day', 'local']; const route = structuredClone(state.operations.routes[0]); route.id='isolated-hourly'; route.name='Isolated hourly package'; route.tripTypes=['local']; for(const fare of Object.values(route.fares)){fare.mode='hourly';fare.hourlyPackages=[{id:'isolated-four-hour',name:'Four hours',hours:4,includedKm:40,fare:500,extraKmRate:10}];} state.operations.routes.push(route); });
const { cabPlaces } = load('src/data/cabPlaces');
const folder = mapboxMode ? 'artifacts/cab-premium/mapbox' : 'artifacts/cab-premium';
const origin = 'http://127.0.0.1:3141';
const executable = process.env.CAB_TEST_CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert(executable, 'An existing Chrome/Edge installation is required');
await mkdir(folder, { recursive: true });
await mkdir('artifacts/cab-system/chrome-profile', { recursive: true });
const profile = await mkdtemp(path.resolve('artifacts/cab-system/chrome-profile/planner-'));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3141'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'production', CAB_STORAGE_MODE: 'mysql' } });
let serverLog = '', browser, ws, stage = 'server startup', sequence = 0;
server.stdout.on('data', chunk => { serverLog += chunk; });
server.stderr.on('data', chunk => { serverLog += chunk; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pending = new Map(), errors = [], consoleErrors = [], checks = [], bookings = new Map(), requests = [];
let searchCalls = 0;
let geocoderCalls = 0, mapTiles = 0, pinConfirmations = 0;
let evaluate;
try {
  for (let i = 0; i < 100; i++) {
    assert(server.exitCode === null, serverLog);
    try { if ((await fetch(origin + '/cabs')).ok) break; } catch {}
    await sleep(200);
  }
  browser = spawn(executable, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let port;
  for (let i = 0; i < 100; i++) { try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch {} await sleep(150); }
  assert(port, 'Browser startup');
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 45000);
    pending.set(id, result => { clearTimeout(timer); if (result.error) reject(Error(result.error.message)); else resolve(result.result); });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.on('message', raw => {
    const message = JSON.parse(raw);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') consoleErrors.push(message.params.args.map(arg => arg.value || arg.description || '').join(' '));
    if (message.method === 'Fetch.requestPaused') void (async () => {
      const { requestId, request } = message.params;
      if (new URL(request.url).hostname === 'api.mapbox.com') {
        // Deliberate image transport fixture; no billable/live Mapbox request.
        mapTiles++;
        await command('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/png' }], body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lX8AAAAASUVORK5CYII=' });
        return;
      }
      const url = new URL(request.url), endpoint = url.pathname.replace('/api/cab/', '');
      let response = {}, status = 200;
      try {
        const input = JSON.parse(request.postData || '{}');
        if (endpoint === 'catalogue') response = await operations.publicCatalogue();
        else if (endpoint === 'search') { searchCalls++; response = await service.searchCabJourney(input); if(liveRoute && input.journey.origin.id===cabPlaces[0].id && input.journey.destination.id===cabPlaces[1].id && input.journey.tripType==='one-way') response.previewRoute=liveRoute; }
        else if (endpoint === 'quote') response = await service.searchCabJourney(input);
        else if (endpoint === 'places' && request.method === 'POST') { pinConfirmations++; response = { place: maps.confirmCabPin(input) }; }
        else if (endpoint === 'places') {
          geocoderCalls++;
          const q = url.searchParams.get('q');
          if (mapboxMode && q === 'Slow old') await sleep(1200);
          if (mapboxMode && q === 'Error test') throw Error('Synthetic provider unavailable');
          // Keep the original listed-place keyboard scenario deterministic.
          response = { places: q === 'Empty test' ? [] : mapboxMode && !q.includes('Lucknow') ? await maps.searchCabPlaces(q) : cabPlaces.filter(p => p.label.toLowerCase().includes(q.toLowerCase())), externalSearch: mapboxMode };
        }
        else if (endpoint === 'bookings') {
          assert.equal(request.method, 'POST');
          assert.deepEqual(Object.keys(input).sort(), ['accessToken', 'consent', 'consents', 'customer', 'journey', 'requestKey']);
          const booking = await service.createCabBooking(input);
          assert.equal((await service.createCabBooking(input)).id, booking.id, 'Idempotent submission');
          bookings.set(booking.id, booking); requests.push(input); response = { booking };
        } else if (endpoint === 'guest/link/exchange') { assert(bookings.has(input.reference)); response = { assurance: 'link' }; }
        else if (endpoint.startsWith('guest/bookings/')) { assert(bookings.has(endpoint.split('/')[2])); response = { assurance: 'link' }; }
        else if (endpoint.startsWith('bookings/')) response = { booking: bookings.get(endpoint.split('/')[1]) };
        else if (endpoint.startsWith('tracking/')) response = { active: false, stale: true, location: null, status: 'REQUESTED' };
        else { status = 401; response = { error: 'Test boundary: not signed in' }; }
      } catch (error) { status = 400; response = { error: error.message }; }
      await command('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(response)).toString('base64') });
    })().catch(error => { if (!/Invalid InterceptionId/.test(error.message)) errors.push(error.message); });
  });
  evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  };
  const until = async (expression, label) => { for (let i = 0; i < 160; i++) { if (await evaluate(expression)) return; await sleep(150); } throw Error('UI wait: ' + label); };
  const click = async text => {
    const expression = `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}||b.getAttribute('aria-label')===${JSON.stringify(text)});if(!b||b.disabled)return false;b.click();return true;})()`;
    await until(expression, 'button ' + text); await sleep(100);
  };
  const set = async (selector, value) => {
    assert(await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`), selector);
    await sleep(80);
  };
  const navigate = async route => { await command('Page.navigate', { url: origin + route }); await until('document.readyState==="complete"', route); };
  const shot = async name => { await evaluate("document.querySelectorAll('.sh-toast button').forEach(b=>b.click()); document.activeElement?.blur()"); await sleep(100); const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(folder + '/' + name + '.png', Buffer.from(result.data, 'base64')); };
  const overflow = async () => assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'Horizontal overflow at ' + stage);
  const responsiveStage = async label => {
    for (const width of [820, 390, 360]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      await overflow(); await shot(label + '-' + width);
    }
    await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    checks.push(label + ': tablet/mobile layout without overflow');
  };
  await command('Runtime.enable'); await command('Page.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }, ...(mapboxMode ? [{ urlPattern: 'https://api.mapbox.com/*' }] : [])] });
  await command('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('sukhad-holidays-account-prompt-dismissed','true')}catch{}" });
  for (const width of [1440, 1024, 820, 390, 360]) {
    stage = 'responsive ' + width;
    await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
    await navigate('/cabs'); await until('document.querySelectorAll(".cb-tabs button").length>=5', 'journey modes');
    await until('!!document.querySelector(".leaflet-container")', 'Leaflet');
    await overflow(); await shot('journey-' + width);
    assert(await evaluate('document.querySelector(".cb-main-card").getBoundingClientRect().top<700'), 'Planner appears promptly');
    assert(await evaluate('[...document.querySelectorAll(".cb-tabs button")].filter(b=>b.getAttribute("aria-pressed")==="true").length===1'));
    checks.push('Planner, map, selected state and no overflow at ' + width);
  }
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  if (mapboxMode) {
    stage = 'Mapbox pickup/drop and pin confirmation';
    await navigate('/cabs'); await until('document.querySelectorAll(".cb-tabs button").length>=5', 'modes');
    const before = geocoderCalls;
    await set('.cb-place input', 'Unselected draft'); await click('Preview route');
    await until('document.querySelector(".cb-alert")?.textContent.includes("Choose a suggested location")','Unselected query cannot submit previous location');
    await click('Custom route'); assert(await evaluate('document.querySelectorAll(".cb-location-grid input:invalid").length===0'),'Journey mode resets location draft'); await click('One-way');
    await set('.cb-place input', 'No'); await sleep(650); assert.equal(geocoderCalls, before, 'Three character minimum');
    await set('.cb-place input', 'Empty test');
    await until('document.querySelector(".cb-place").textContent.includes("No matching address")', 'empty results fallback');
    await set('.cb-place input', 'Error test');
    await until('document.querySelector(".cb-place").textContent.includes("Address search is unavailable")', 'error fallback');
    assert(await evaluate('document.querySelectorAll(".cb-place .cb-location-suggestions button").length>1'), 'Listed fallback still available');
    const failedCalls=geocoderCalls; await click('Retry address search'); await sleep(700); assert(geocoderCalls>failedCalls,'Explicit retry sends a new search');
    await set('.cb-place input', 'Slow old'); await sleep(600);
    await set('.cb-place input', 'Fast new');
    await until('document.querySelector(".cb-location-suggestions button")?.textContent.includes("Fast new street")', 'newer search result');
    await sleep(1300);
    assert(await evaluate('document.querySelector(".cb-location-suggestions button").textContent.includes("Fast new street")'), 'Old response cannot replace new results');
    await set('.cb-place input', 'Noida Sector 62');
    await until('document.querySelector(".cb-location-suggestions button")?.textContent.includes("Sector 62")', 'Mapbox address suggestion');
    await evaluate('document.querySelector(".cb-location-suggestions button").click()');
    assert.equal(await evaluate('document.querySelector(".cb-place input").value'), mapboxFixture.label, 'Selected address displayed');
    await until('document.querySelector(".cb-location-grid .cb-place").dataset.placeId.startsWith("mapbox-")', 'signed pickup selection');
    await until('!!document.querySelector(".cb-mapbox-wordmark")', 'Mapbox attribution');
    await set('.cb-location-grid .cb-place:last-child input', 'Noida street');
    await until('document.querySelector(".cb-location-grid .cb-place:last-child .cb-location-suggestions button")?.textContent.includes("Sector 62")', 'drop suggestions');
    await evaluate('document.querySelector(".cb-location-grid .cb-place:last-child .cb-location-suggestions button").click()');
    await click('Adjust pickup pin'); await until('!!document.querySelector(".cb-confirm-pin")', 'draggable marker');
    await evaluate('document.querySelector(".cb-pin-controls fieldset details").open=true');
    await set('.cb-pin-controls input[min="6"]', '28.628');
    await set('.cb-pin-controls input[min="68"]', '77.366');
    await click('Confirm this pin');
    await until('document.querySelector(".cb-location-grid .cb-place").dataset.placeId.startsWith("mapbox-pin-")', 'server signed adjusted pin');
    assert.equal(pinConfirmations, 1);
    await click('Adjust drop pin'); await until('!!document.querySelector(".cb-confirm-pin")','drop draggable marker');
    await set('.cb-pin-controls input[min="6"]', '28.630'); await set('.cb-pin-controls input[min="68"]','77.367'); await click('Confirm this pin');
    await until('document.querySelector(".cb-location-grid .cb-place:last-child").dataset.placeId.startsWith("mapbox-pin-")','signed drop pin'); assert.equal(pinConfirmations,2);
    await until('document.querySelectorAll(".cb-confirm-pin").length===0', 'pin editing finished');
    assert(mapTiles > 0, 'Mapbox tile transport requested');
    checks.push('Mapbox pickup/drop, selected address display, min length, map attribution, pin adjustment and server signature');
    await shot('mapbox-pin-confirmed');
  }
  const departure = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) + 'T12:00';
  const returnAt = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10) + 'T18:00';
  for (const mode of ['one-way', 'round-trip', 'airport', 'custom', 'multi-day', 'local']) {
    stage = mode; await navigate('/cabs'); await until('document.querySelectorAll(".cb-tabs button").length>=5', 'modes');
    await evaluate(`document.querySelectorAll('.cb-tabs button')[${['one-way', 'round-trip', 'airport', 'custom', 'multi-day', 'local'].indexOf(mode)}].click()`);
    await sleep(150);
    if (mode === 'one-way') {
      const before = await evaluate('[...document.querySelectorAll(".cb-location-grid .cb-place")].map(e=>e.dataset.placeId)');
      await click('Swap pickup and drop');
      assert.deepEqual(await evaluate('[...document.querySelectorAll(".cb-location-grid .cb-place")].map(e=>e.dataset.placeId)'), before.toReversed());
      await click('Swap pickup and drop');
      await set('.cb-place input', 'Lucknow');
      await until('document.querySelectorAll(".cb-location-suggestions button").length>0', 'autocomplete');
      await evaluate('document.querySelector(".cb-place input").focus()');
      await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown' });
      assert(await evaluate('document.activeElement.closest(".cb-location-suggestions")!==null'), 'Keyboard suggestion focus');
      await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
      assert(await evaluate('document.activeElement===document.querySelector(".cb-place input")'));
    }
    if (mode === 'airport') {
      await evaluate('document.querySelectorAll(".cb-airport-direction input")[1].click()');
      assert(await evaluate('document.querySelectorAll(".cb-location-grid .cb-place input")[1].value.includes("Airport")'));
    }
    assert(await evaluate('!document.querySelector(".cb-optional-details").open'), 'Optional details collapsed');
    if (mode === 'local') await set('select[aria-label="Configured route"]', 'isolated-hourly');
    if (mode === 'multi-day') {
      await click('Add destination'); await click('Move stop 1 down');
      assert.equal(await evaluate('document.querySelectorAll(".cb-itinerary-stop").length'), 2);
      await set('.cb-itinerary-stop .cb-place input','Unselected stop'); await click('Preview route'); await until('document.querySelector(".cb-alert")?.textContent.includes("Choose a suggested location")','Unselected itinerary cannot preview an old stop'); await evaluate('document.querySelector(".cb-itinerary-stop .cb-place input").focus()'); await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
      await overflow(); await shot('multi-day');
    }
    await set('input[type="datetime-local"]', '2000-01-01T12:00');
    await click('Preview route'); await until('document.querySelectorAll(".cb-inline-error").length>0', 'past date rejection');
    await set('input[type="datetime-local"]', departure);
    if (['round-trip', 'multi-day'].includes(mode)) {
      await set('input[type="datetime-local"][min]', departure);
      await click('Preview route'); await until('document.querySelectorAll(".cb-inline-error").length>0', 'return date rejection');
      await set('input[type="datetime-local"][min]', returnAt);
    }
    const count = searchCalls; await click('Preview route');
    await until('!document.querySelector("#cab-journey-form").getAttribute("aria-busy") || document.querySelector("#cab-journey-form").getAttribute("aria-busy")==="false"', 'route response');
    assert.equal(searchCalls, count + 1);
    if (mode === 'one-way') { if(liveRoute) await until('document.querySelectorAll(".leaflet-overlay-pane path").length>0','actual road polyline rendered'); await sleep(800); await shot('route-preview'); await responsiveStage('route-preview'); }
    await click('Explore vehicles & fares'); await until('!!document.querySelector(".cb-vehicle-grid")', 'vehicles');
    assert.equal(searchCalls, count + 1, 'Preview reused for unchanged immediate search');
    await overflow(); if (mode === 'one-way') { await shot('vehicles'); await responsiveStage('vehicles'); }
    await until('[...document.images].filter(e=>e.closest(".cb-vehicle")).every(e=>e.complete)', 'vehicle images loaded');
    assert(await evaluate('[...document.images].filter(e=>e.closest(".cb-vehicle")).every(e=>e.naturalWidth>0)'), 'Vehicle images');
    await click('Continue with this vehicle'); await until('!!document.querySelector("[data-booking-step=passenger]")', 'server quotation and contact');
    await set('input[autocomplete=name]', 'Browser Test Traveller');
    await set('input[autocomplete=tel]', '+919000000003');
    await set('input[autocomplete=email]', 'planner-test@example.invalid');
    await click('Review quote request'); await until('!!document.querySelector("[data-booking-step=review]")', 'review');
    assert(await evaluate('document.querySelector(".cb-primary").disabled'), 'Separate consents required');
    await evaluate('document.querySelectorAll(".cb-consent input").forEach(e=>e.click())');
    if (mode === 'one-way') { await shot('review'); await responsiveStage('review'); }
    await overflow(); await click('Request a quote');
    await until('!!document.querySelector(".cb-reference")', 'booking reference');
    assert(await evaluate('document.body.textContent.includes("Pending Review")'), 'Request remains pending');
    const reference = await evaluate('document.querySelector(".cb-reference").textContent');
    assert.match(reference, /^SH-CAB-[A-F0-9]{24}$/);
    assert.equal(requests.at(-1).journey.tripType, mode);
    assert.equal(requests.at(-1).journey.pickupAddress, '');
    assert.equal(requests.at(-1).journey.dropAddress, '');
    assert.equal(bookings.get(reference).assignment, undefined);
    assert.equal(bookings.get(reference).payments.length, 0);
    assert.equal(bookings.get(reference).status, 'REQUESTED');
    await command('Page.reload'); await until('!!document.querySelector(".cb-reference")', 'retrieval after reload');
    checks.push(mode + ': validation, preview, vehicles, server fare, contact, review, consents, unchanged payload, idempotent domain submission, pending reference and retrieval UI');
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(consoleErrors.length, 0, consoleErrors.join('\n'));
  console.log('PASS ' + checks.length + ' browser groups. Guest auth/session and persistence are test boundaries; no live booking was made.');
} catch (error) {
  console.error('FAIL', stage, error.message);
  if (evaluate) console.error(await evaluate('({step:document.querySelector("[data-booking-step]")?.dataset.bookingStep,alert:document.querySelector(".cb-alert")?.textContent})').catch(() => ({})));
  process.exitCode = 1;
} finally {
  await writeFile(folder + '/verification.json', JSON.stringify({ stage, liveRoute:liveRoute?{source:liveRoute.source,distanceKm:liveRoute.distanceKm,durationMinutes:liveRoute.durationMinutes,geometryPoints:liveRoute.geometry.length}:null, checks, runtimeErrors: errors, consoleErrors, mapTiles, pinConfirmations, submittedModes: requests.map(r => r.journey.tripType), isolation: liveRoute ? 'One actual configured Mapbox road route; booking/domain services in memory, API/auth/persistence fixtures. No real database, geocoder, email or payments.' : 'Existing domain services in memory; API/auth/persistence and Mapbox image/geocoder transport fixtures. No real database, geocoder, email or payments.', passed: !process.exitCode }, null, 2));
  ws?.close(); browser?.kill(); server.kill();
}
