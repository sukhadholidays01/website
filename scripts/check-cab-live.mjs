import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

const port = Number(process.env.CAB_TEST_PORT || 3106),
  mapPort = port + 1;
const origin = `http://127.0.0.1:${port}`;
await mkdir(".cab-test-data", { recursive: true });
const dataDir = await mkdtemp(path.resolve(".cab-test-data/run-"));
await mkdir("artifacts/cab-live", { recursive: true });
const password = randomBytes(24).toString("hex");
const report = { checks: [], browser: null, errors: [] };
const record = (name) => {
  report.checks.push(name);
  console.log("PASS", name);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let cookie = "",
  serverLog = "";
const mock = createServer((req, res) => {
  const url = new URL(req.url, "http://fixture");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/search") {
    res.end(
      JSON.stringify([
        {
          display_name: "Fixture landmark, Ayodhya, India",
          name: "Fixture landmark",
          lat: "26.80",
          lon: "82.21",
          address: { city: "Ayodhya" },
          type: "hotel",
        },
      ]),
    );
    return;
  }
  const points = url.pathname
    .split("/")
    .at(-1)
    .split(";")
    .map((s) => s.split(",").map(Number));
  if (points.some((p) => p[0] === 85.0002)) {
    res.end(JSON.stringify({ code: "NoRoute", routes: [] }));
    return;
  }
  const distance = points[0][0] > points.at(-1)[0] ? 250000 : 200000;
  res.end(
    JSON.stringify({
      code: "Ok",
      routes: [
        {
          distance,
          duration: 10800,
          geometry: { coordinates: points, type: "LineString" },
        },
      ],
    }),
  );
});
mock.listen(mapPort, "127.0.0.1");
await once(mock, "listening");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "-H",
    "127.0.0.1",
    "-p",
    String(port),
  ],
  {
    cwd: process.cwd(),
    windowsHide: true,
    env: {
      ...process.env,
      CAB_STORAGE_MODE: "memory",
      CAB_ALLOW_LOCAL_STORAGE: "true",
      CAB_TEST_SCOPE: path.basename(dataDir),
      CAB_ADMIN_PASSWORD: password,
      CAB_SESSION_SECRET: randomBytes(40).toString("hex"),
      CAB_SITE_ORIGIN: origin,
      CAB_OSRM_URL: `http://127.0.0.1:${mapPort}`,
      CAB_GEOCODER_URL: `http://127.0.0.1:${mapPort}`,
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stdout.on("data", (chunk) => (serverLog += chunk));
child.stderr.on("data", (chunk) => (serverLog += chunk));
async function api(
  endpoint,
  {
    method = "GET",
    body,
    token,
    admin = false,
    status = 200,
    ip = "127.0.0.1",
    headers = {},
  } = {},
) {
  const response = await fetch(origin + "/api/cab/" + endpoint, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      ...(admin ? { Cookie: cookie } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${endpoint}: ${JSON.stringify(result.error || { status: response.status }).slice(0, 500)}`,
  );
  return { response, result };
}
const ayodhya = {
  id: "ayodhya",
  label: "Ayodhya",
  city: "Ayodhya",
  lat: 26.799,
  lon: 82.204,
};
const varanasi = {
  id: "varanasi",
  label: "Varanasi",
  city: "Varanasi",
  lat: 25.3176,
  lon: 82.9739,
};
const airport = {
  id: "ayodhya-airport",
  label: "Ayodhya Airport (AYJ)",
  city: "Ayodhya",
  lat: 26.7513,
  lon: 82.1553,
  airport: true,
};
const start = new Date(Date.now() + 3 * 86400000);
start.setUTCHours(8, 0, 0, 0);
const local = (d) =>
  new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 16);
const journey = {
  tripType: "one-way",
  airportDirection: "pickup",
  origin: ayodhya,
  destination: varanasi,
  departure: local(start),
  passengers: 2,
  vehicle: "sedan",
  pickupAddress: "Fixture hotel, Ayodhya",
  dropAddress: "Fixture hotel, Varanasi",
  flightNumber: "",
};
const customer = {
  name: "Fixture Traveller",
  phone: "9000000000",
  email: "",
  notes: "Automated verification fixture only",
};
const quote = async (j) =>
  (await api("quote", { method: "POST", body: { journey: j } })).result;
async function booking(j, ip = "127.0.0.1") {
  const accessToken = randomBytes(32).toString("hex");
  const payload = {
    journey: j,
    customer,
    requestKey: randomUUID(),
    accessToken,
    consent: true,
  };
  const { result } = await api("bookings", {
    method: "POST",
    body: payload,
    status: 201,
    ip,
  });
  return { b: result.booking, token: accessToken, payload };
}
const op = async (id, body, status = 200) =>
  (
    await api("admin/bookings/" + id, {
      method: "PATCH",
      admin: true,
      body,
      status,
    })
  ).result.booking;
const accept = async (entry, version, status = 200) =>
  (
    await api("bookings/" + entry.b.id, {
      method: "PATCH",
      token: entry.token,
      body: { action: "accept", version },
      status,
    })
  ).result.booking;
const finalQuote = (amount) => ({
  action: "quote",
  amount,
  inclusions: "Vehicle, fuel and driver included",
  exclusions: "Tolls and parking payable at actuals",
});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error(serverLog);
    try {
      const r = await fetch(origin + "/api/cab/session");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await wait(400);
  }
  assert(ready, "Production test server did not start. " + serverLog);
  await api("admin", { status: 401 });
  await api("session", {
    method: "POST",
    body: { password },
    headers: { Origin: "https://wrong.example" },
    status: 403,
  });
  await api("session", {
    method: "POST",
    body: { password: "wrong" },
    status: 401,
  });
  const login = await api("session", { method: "POST", body: { password } });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  assert(login.response.headers.get("set-cookie").includes("HttpOnly"));
  record(
    "Admin authentication, HttpOnly session, rejected demo/anonymous access and cross-origin mutation",
  );
  const initial = (await api("admin", { admin: true })).result;
  assert.equal(initial.config.manual.length, 51);
  assert(initial.config.manual.every((r) => !r.active && r.fixedFare === null));
  assert(initial.config.automatic.every((r) => !r.active));
  const initialQuote = await quote(journey);
  assert.equal(initialQuote.fare.total, null);
  assert.equal(initialQuote.route.distanceKm, 200);
  record("51 source-sheet draft fares; no invented rates; OSRM road distance");
  const locations = (await api("places?q=Fixture")).result.places;
  const external = locations.find((p) => p.id.startsWith("osm-"));
  assert(external);
  await quote({ ...journey, destination: external });
  await api("quote", {
    method: "POST",
    body: { journey: { ...journey, destination: { ...external, lat: 26.9 } } },
    status: 400,
  });
  record(
    "Explicit geocoding and signed place validation reject coordinate tampering",
  );
  const one = await booking(journey);
  assert.equal(one.b.status, "REQUESTED");
  assert.equal(one.b.fare.total, null);
  assert(!("accessHash" in one.b));
  assert(!("requestKey" in one.b));
  await api("bookings/" + one.b.id, { token: "invalid", status: 403 });
  const duplicate = (
    await api("bookings", { method: "POST", body: one.payload, status: 201 })
  ).result.booking;
  assert.equal(duplicate.id, one.b.id);
  await api("bookings", {
    method: "POST",
    body: { ...one.payload, customer: { ...customer, name: "Changed name" } },
    status: 409,
  });
  record(
    "Server persistence, private booking access and idempotent submission",
  );
  await op(one.b.id, { action: "confirm" }, 409);
  await op(
    one.b.id,
    {
      action: "payment",
      amount: 100,
      type: "receipt",
      method: "Cash",
      reference: "early",
      note: "Not accepted yet",
    },
    409,
  );
  let b = await op(one.b.id, finalQuote(3500));
  await accept(one, "stale-version", 409);
  await accept(one, b.fare.version);
  b = await op(one.b.id, finalQuote(3600));
  assert.equal(b.status, "QUOTED");
  assert(!b.acceptedVersion);
  await op(one.b.id, { action: "confirm" }, 409);
  await accept(one, b.fare.version);
  b = await op(one.b.id, { action: "confirm" });
  assert.equal(b.status, "CONFIRMED");
  record(
    "Final quote, customer acceptance, re-quote invalidation and availability confirmation",
  );
  const receipt = {
    action: "payment",
    amount: 1000,
    type: "receipt",
    method: "UPI",
    reference: "fixture-receipt-1",
    note: "Externally verified fixture receipt",
  };
  b = await op(one.b.id, receipt);
  assert.equal(b.payments.length, 1);
  await op(one.b.id, receipt, 409);
  await op(
    one.b.id,
    { ...receipt, amount: 5000, reference: "overpayment" },
    400,
  );
  b = await op(one.b.id, {
    action: "assign",
    driver: "Fixture Driver",
    phone: "9000000001",
    vehicle: "UP42AB1234",
  });
  assert.equal(b.status, "ASSIGNED");
  const roundJourney = {
    ...journey,
    tripType: "round-trip",
    returnAt: local(new Date(start.getTime() + 36 * 3600000)),
  };
  const round = await booking(roundJourney, "127.0.0.2");
  assert.equal(round.b.route.returnDistanceKm, 250);
  b = await op(round.b.id, finalQuote(7000));
  await accept(round, b.fare.version);
  await op(round.b.id, { action: "confirm" });
  await op(
    round.b.id,
    {
      action: "assign",
      driver: "Fixture Driver",
      phone: "9000000001",
      vehicle: "UP42XX9999",
    },
    409,
  );
  await op(
    round.b.id,
    {
      action: "assign",
      driver: "Other Driver",
      phone: "9000000002",
      vehicle: "UP 42 AB 1234",
    },
    409,
  );
  await op(round.b.id, {
    action: "cancel",
    reason: "Fixture overlap cancellation",
  });
  record(
    "Round-trip return leg and overlapping driver/registration assignment protection",
  );
  const pickupJourney = {
    ...journey,
    tripType: "airport",
    origin: airport,
    destination: ayodhya,
    flightNumber: "6E123",
  };
  const dropJourney = {
    ...pickupJourney,
    airportDirection: "drop",
    origin: ayodhya,
    destination: airport,
  };
  const pickup = await booking(pickupJourney, "127.0.0.3");
  const drop = await booking(dropJourney, "127.0.0.3");
  assert.equal(pickup.b.journey.airportDirection, "pickup");
  assert.equal(drop.b.journey.airportDirection, "drop");
  await api("bookings/" + pickup.b.id, {
    method: "PATCH",
    token: pickup.token,
    body: { action: "cancel" },
  });
  await api("quote", {
    method: "POST",
    body: { journey: { ...journey, tripType: "airport" } },
    status: 400,
  });
  record(
    "Airport pickup/drop with flight details, airport validation and customer cancellation",
  );
  await api("quote", {
    method: "POST",
    body: { journey: { ...journey, passengers: 6 } },
    status: 400,
  });
  await api("quote", {
    method: "POST",
    body: { journey: { ...journey, departure: "2020-01-01T10:00" } },
    status: 400,
  });
  await api("quote", {
    method: "POST",
    body: {
      journey: {
        ...roundJourney,
        returnAt: local(new Date(start.getTime() + 3600000)),
      },
    },
    status: 400,
  });
  record(
    "Passenger capacity, past pickup and impossible round-trip timing validation",
  );
  await op(one.b.id, { action: "start" });
  b = await op(one.b.id, { action: "complete" });
  assert.equal(b.status, "COMPLETED");
  assert.equal(
    b.payments.reduce((s, p) => s + p.amount, 0),
    1000,
  );
  b = await op(one.b.id, {
    action: "payment",
    amount: 100,
    type: "refund",
    method: "UPI",
    reference: "fixture-refund-1",
    note: "Verified fixture refund",
  });
  assert.equal(
    b.payments.reduce(
      (s, p) => s + (p.type === "refund" ? -p.amount : p.amount),
      0,
    ),
    900,
  );
  await op(
    one.b.id,
    {
      action: "payment",
      amount: 1000,
      type: "refund",
      method: "UPI",
      reference: "refund-too-large",
      note: "Invalid excess refund",
    },
    400,
  );
  await op(one.b.id, { action: "cancel", reason: "Too late to cancel" }, 409);
  record(
    "Trip start/completion, independent payment status, duplicate/overpayment and refund limits",
  );
  const current = (await api("admin", { admin: true })).result.config;
  const fixed = {
    ...current.manual[0],
    fixedFare: 3500,
    active: true,
    inclusions: "Fuel and driver",
    exclusions: "Toll and parking extra",
  };
  current.manual[0] = fixed;
  current.automatic = current.automatic.map((r) =>
    r.vehicle === "sedan" && ["one-way", "round-trip"].includes(r.tripType)
      ? {
          ...r,
          active: true,
          base: 100,
          perKm: 10,
          minimumKm: 0,
          minimumKmPerDay: 300,
          driverPerDay: 200,
          inclusions: "Fuel and driver allowance",
          exclusions: "Toll and parking extra",
        }
      : r,
  );
  current.manual.push({
    id: randomUUID(),
    origin: "Ayodhya",
    destination: "Ayodhya",
    tripType: "airport",
    vehicle: "sedan",
    active: true,
    fixedFare: 500,
    sourceNote: "Fixture pickup fare",
    inclusions: "Fuel and driver",
    exclusions: "Parking extra",
    airportDirection: "pickup",
  });
  current.manual.push({
    ...current.manual.at(-1),
    id: randomUUID(),
    fixedFare: 600,
    airportDirection: "drop",
  });
  await api("admin/config", { method: "PUT", admin: true, body: current });
  await api("admin/config", {
    method: "PUT",
    admin: true,
    body: current,
    status: 409,
  });
  assert.equal((await quote(journey)).fare.total, 3500);
  const reversed = await quote({
    ...journey,
    origin: varanasi,
    destination: ayodhya,
  });
  assert.equal(reversed.fare.method, "automatic");
  assert.equal(reversed.fare.total, 2800);
  const rq = await quote(roundJourney);
  assert.equal(rq.fare.billableKm, 600);
  assert.equal(rq.fare.total, 6500);
  assert.equal((await quote(pickupJourney)).fare.total, 500);
  assert.equal((await quote(dropJourney)).fare.total, 600);
  const after = (await api("bookings/" + one.b.id, { token: one.token })).result
    .booking;
  assert.equal(after.fare.total, 3600);
  record(
    "Manual priority, directional fares, automatic daily minimums, airport direction and preserved accepted prices",
  );
  const nextConfig = (await api("admin", { admin: true })).result.config;
  nextConfig.manual.push({ ...nextConfig.manual[0], id: randomUUID() });
  await api("admin/config", {
    method: "PUT",
    admin: true,
    body: nextConfig,
    status: 400,
  });
  record("Duplicate active fare and concurrent rate revision protection");
  // Different simulated trusted-proxy IP avoids conflating validation cases with route throttling.
  const noRoute = await api("quote", {
    method: "POST",
    ip: "127.0.0.4",
    body: {
      journey: {
        ...journey,
        destination: {
          id: "gaya",
          label: "Gaya",
          city: "Gaya",
          lat: 24.7914,
          lon: 85.0002,
        },
      },
    },
  });
  assert.equal(noRoute.result.route, null);
  assert.equal(noRoute.result.fare.total, null);
  record(
    "Routing failure produces a manual quote request, never an invented automatic fare",
  );
  for (let i = 0; i < 8; i++)
    await api("session", {
      method: "POST",
      ip: "127.0.0.5",
      body: { password: "wrong" },
      status: 401,
    });
  await api("session", {
    method: "POST",
    ip: "127.0.0.5",
    body: { password: "wrong" },
    status: 429,
  });
  record("Persistent login throttling");
  const dashboard = (await api("admin", { admin: true })).result;
  assert.equal(dashboard.bookings.length, 4);
  assert(dashboard.bookings.every((b) => !b.accessHash));
  await api("session", { method: "DELETE", admin: true });
  await api("admin", { admin: true, status: 401 });
  record("Shared operations listing and server logout");
  if (process.argv.includes("--browser")) {
    const { checkCabBrowser } = await import("./check-cab-live-browser.mjs");
    report.browser = await checkCabBrowser({
      origin,
      password,
      bookingId: one.b.id,
      bookingToken: one.token,
    });
  }
} catch (error) {
  report.errors.push(error.stack || String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  child.kill();
  mock.close();
  await writeFile(
    "artifacts/cab-live/verification.json",
    JSON.stringify(report, null, 2),
  );
  await writeFile("artifacts/cab-live/server.log", serverLog);
  console.log(
    `${report.checks.length} check groups passed. Report: artifacts/cab-live/verification.json`,
  );
}
