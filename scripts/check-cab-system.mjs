import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { loadCabModule } from "./cab-test-loader.mjs";

const checks = [],
  report = { mode: "development-mock", checks, browser: null, errors: [] };
const pass = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
const { developmentOperations } = loadCabModule("src/lib/cab/development");
const { calculateConfiguredFare } = loadCabModule("src/lib/cab/pricing");
const { emptyFare } = loadCabModule("src/lib/cab/models");
const { initialCabConfig } = loadCabModule("src/lib/cab/config");
const { assertAssignment } = loadCabModule("src/lib/cab/assignments");
const { renderCabEmail } = loadCabModule("src/lib/cab/email-templates");
const { verifyRazorpaySignature, verifyRazorpayWebhook } = loadCabModule(
  "src/lib/cab/payment-signatures",
);
const operations = developmentOperations(),
  route = operations.routes[0];
const future = new Date(Date.now() + 5 * 86400000);
future.setUTCHours(8, 0, 0, 0);
const local = (d) =>
  new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 16);
const journey = {
  tripType: "one-way",
  airportDirection: "pickup",
  origin: route.origin,
  destination: route.destination,
  departure: local(future),
  passengers: 2,
  vehicle: "sedan",
  pickupAddress: "Fixture pickup hotel, Ayodhya",
  dropAddress: "Fixture drop hotel, Varanasi",
  routeId: route.id,
};
const road = {
  distanceKm: 220,
  durationMinutes: 240,
  returnDistanceKm: 225,
  returnDurationMinutes: 250,
  geometry: [],
  source: "demo",
};
const customer = {
  name: "Fixture Traveller",
  phone: "9000000000",
  email: "fixture@example.invalid",
  notes: "Automated development test only",
};
const roundJourney = {
  ...journey,
  tripType: "round-trip",
  returnAt: local(new Date(future.getTime() + 36 * 3600000)),
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const port = Number(process.env.CAB_TEST_PORT || 3116),
  origin = `http://127.0.0.1:${port}`;
const password = randomBytes(24).toString("hex"),
  gatewaySecret = randomBytes(32).toString("hex"),
  webhookSecret = randomBytes(32).toString("hex");
let cookie = "",
  serverLog = "",
  child;
await mkdir("artifacts/cab-system", { recursive: true });
try {
  const manual = {
    ...emptyFare(),
    mode: "manual",
    manualFare: 3000,
    tollMode: "fixed",
    tollAmount: 100,
    extras: [{ label: "Parking", amount: 50 }],
    discount: { enabled: true, type: "fixed", value: 200 },
  };
  let fare = calculateConfiguredFare(
    journey,
    road,
    route,
    manual,
    operations.settings,
  );
  assert.equal(fare.total, 3200);
  assert(
    fare.lines.some(
      (l) => l.label === "Additional fixed charge" && l.amount === 250,
    ),
  );
  assert.equal(
    calculateConfiguredFare(
      journey,
      null,
      route,
      { ...manual, discount: { enabled: false, type: "fixed", value: 0 } },
      operations.settings,
    ).total,
    3400,
  );
  const auto = {
    ...emptyFare(),
    mode: "automatic",
    baseFare: 100,
    perKm: 10,
    minimumKm: 100,
    driverPerDay: 200,
    tollMode: "fixed",
    tollAmount: 100,
  };
  assert.equal(
    calculateConfiguredFare(journey, road, route, auto, operations.settings)
      .total,
    2850,
  );
  const round = calculateConfiguredFare(
    roundJourney,
    road,
    route,
    { ...auto, minimumKmPerDay: 300 },
    operations.settings,
  );
  assert.equal(round.billableKm, 600);
  assert.equal(round.total, 6850);
  assert.equal(
    calculateConfiguredFare(
      journey,
      road,
      route,
      { ...auto, mode: "hybrid", manualFare: 1000 },
      operations.settings,
    ).total,
    3850,
  );
  assert.equal(
    calculateConfiguredFare(
      journey,
      road,
      route,
      { ...auto, billableKm: 250, minimumFare: 4000, fixedCharge: 100 },
      operations.settings,
    ).total,
    4200,
  );
  assert.equal(
    calculateConfiguredFare(journey, null, route, auto, operations.settings)
      .total,
    null,
  );
  assert.equal(
    calculateConfiguredFare(
      roundJourney,
      { ...road, returnDistanceKm: undefined },
      route,
      auto,
      operations.settings,
    ).total,
    null,
  );
  const hourly = {
    ...emptyFare(),
    mode: "hourly",
    hourlyPackages: [
      {
        id: "four",
        name: "4 hours / 40 km",
        hours: 4,
        includedKm: 40,
        fare: 1000,
        extraKmRate: 10,
      },
    ],
  };
  assert.equal(
    calculateConfiguredFare(
      { ...journey, tripType: "local", packageId: "four" },
      null,
      route,
      hourly,
      operations.settings,
    ).total,
    1250,
  );
  assert.throws(() =>
    calculateConfiguredFare(
      journey,
      road,
      route,
      { ...auto, perKm: -1 },
      operations.settings,
    ),
  );
  assert.throws(() =>
    calculateConfiguredFare(
      journey,
      road,
      route,
      { ...auto, discount: { enabled: true, type: "percent", value: 101 } },
      operations.settings,
    ),
  );
  pass(
    "Pure fare engine: manual, automatic, hybrid, round-trip daily minimums, tolls, ₹250/default override, discounts, minimum fare, billable override and hourly packages",
  );
  const booking = {
    id: "fixture-booking",
    journey,
    route: road,
    fare,
    status: "CONFIRMED",
    customer,
    payments: [],
    history: [],
    development: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const state = {
    config: initialCabConfig(),
    operations: structuredClone(operations),
    bookings: [booking],
    limits: {},
  };
  assert.equal(
    assertAssignment(state, booking, "demo-driver-1", "demo-vehicle-0")
      .vehicleId,
    "demo-vehicle-0",
  );
  assert.throws(
    () => assertAssignment(state, booking, "demo-driver-2", "demo-vehicle-0"),
    /approved/,
  );
  assert.throws(
    () => assertAssignment(state, booking, "demo-driver-1", "demo-vehicle-1"),
    /category/,
  );
  assert.throws(
    () =>
      assertAssignment(
        state,
        { ...booking, journey: { ...journey, passengers: 5 } },
        "demo-driver-1",
        "demo-vehicle-0",
      ),
    /capacity/,
  );
  state.bookings.push({
    ...booking,
    id: "conflicting",
    status: "ASSIGNED",
    assignment: {
      driverId: "demo-driver-1",
      vehicleId: "demo-vehicle-0",
      driver: "Demo Driver One",
      phone: "9000000001",
      vehicle: "DEMO-CAB-1",
    },
  });
  assert.throws(
    () => assertAssignment(state, booking, "demo-driver-1", "demo-vehicle-0"),
    /conflicting/,
  );
  pass(
    "Pure assignment checks: approved/active driver, compatible category/capacity and overlapping schedules",
  );
  for (const kind of [
    "request",
    "confirmation",
    "status",
    "assignment",
    "payment-success",
    "payment-failure",
    "admin-request",
  ]) {
    const email = renderCabEmail(kind, {
      ...booking,
      customer: { ...customer, name: "<script>alert(1)</script>" },
    });
    assert(email.subject.includes("[DEVELOPMENT]"));
    assert(!email.html.includes("<script>"));
    assert(email.html.includes("&lt;script&gt;"));
    assert(email.text.includes("DEVELOPMENT"));
  }
  pass(
    "All seven branded email templates render with escaped customer input and development labels",
  );
  const signature = createHmac("sha256", gatewaySecret)
    .update("order_fixture|payment_fixture")
    .digest("hex");
  assert(
    verifyRazorpaySignature(
      "order_fixture",
      "payment_fixture",
      signature,
      gatewaySecret,
    ),
  );
  assert(
    !verifyRazorpaySignature(
      "tampered",
      "payment_fixture",
      signature,
      gatewaySecret,
    ),
  );
  const raw = '{"event":"payment.captured"}',
    webhookSignature = createHmac("sha256", webhookSecret)
      .update(raw)
      .digest("hex");
  assert(verifyRazorpayWebhook(raw, webhookSignature, webhookSecret));
  assert(!verifyRazorpayWebhook(raw + " ", webhookSignature, webhookSecret));
  pass(
    "Razorpay HMAC verification rejects tampered callbacks and raw webhook payloads",
  );
  const { mockCabRepository } = loadCabModule("src/lib/cab/repository");
  const before = await mockCabRepository.read();
  await assert.rejects(
    mockCabRepository.transaction((s) => {
      s.operations.routes = [];
      throw Error("rollback");
    }),
  );
  assert.equal(
    (await mockCabRepository.read()).operations.routes.length,
    before.operations.routes.length,
  );
  assert.equal(mockCabRepository.persistent, false);
  pass(
    "Mock repository is explicitly non-persistent and rolls back failed atomic mutations",
  );
  const { routingProvider } = loadCabModule("src/lib/cab/routing");
  const savedFetch = globalThis.fetch,
    savedProvider = process.env.CAB_ROUTING_PROVIDER,
    savedToken = process.env.CAB_MAPBOX_TOKEN;
  try {
    process.env.CAB_ROUTING_PROVIDER = "mapbox";
    process.env.CAB_MAPBOX_TOKEN = "fixture-token";
    globalThis.fetch = async (url) => {
      assert(String(url).startsWith("https://api.mapbox.com/directions/"));
      return Response.json({
        code: "Ok",
        routes: [
          {
            distance: 123400,
            duration: 7200,
            geometry: {
              coordinates: [
                [82, 26],
                [83, 25],
              ],
            },
          },
        ],
      });
    };
    assert.equal(
      (await routingProvider().route(route.origin, route.destination))
        .distanceKm,
      123.4,
    );
    globalThis.fetch = async () =>
      Response.json({ code: "NoRoute", routes: [] });
    await assert.rejects(
      routingProvider().route(route.origin, route.destination),
    );
    globalThis.fetch = async () => {
      throw new DOMException("fixture timeout", "TimeoutError");
    };
    await assert.rejects(
      routingProvider().route(route.origin, route.destination),
    );
    await assert.rejects(
      routingProvider().route({ ...route.origin, lat: NaN }, route.destination),
    );
  } finally {
    globalThis.fetch = savedFetch;
    if (savedProvider === undefined) delete process.env.CAB_ROUTING_PROVIDER;
    else process.env.CAB_ROUTING_PROVIDER = savedProvider;
    if (savedToken === undefined) delete process.env.CAB_MAPBOX_TOKEN;
    else process.env.CAB_MAPBOX_TOKEN = savedToken;
  }
  pass(
    "Provider-independent routing: Mapbox contract, valid coordinates, no-route and timeout handling with no guessed distance",
  );

  child = spawn(
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
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        CAB_STORAGE_MODE: "memory",
        CAB_ADMIN_PASSWORD: password,
        CAB_SESSION_SECRET: randomBytes(48).toString("hex"),
        CAB_SITE_ORIGIN: origin,
        CAB_ALLOW_LOCAL_STORAGE: "true",
        CAB_ROUTING_PROVIDER: "demo",
        CAB_OSRM_URL: "",
        CAB_EMAIL_MODE: "preview",
        CAB_ALLOW_MOCK_EMAIL_SEND: "false",
        RAZORPAY_KEY_SECRET: gatewaySecret,
        RAZORPAY_WEBHOOK_SECRET: webhookSecret,
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
    },
  );
  child.stdout.on("data", (c) => (serverLog += c));
  child.stderr.on("data", (c) => (serverLog += c));
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error(serverLog);
    try {
      if ((await fetch(origin + "/api/cab/session")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await wait(300);
  }
  assert(ready, "Test server did not start.");
  let ipSequence = 1;
  async function api(
    endpoint,
    {
      method = "GET",
      body,
      token,
      admin = false,
      status = 200,
      headers = {},
      ip = "127.0.0." + ipSequence,
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
    const value = await response.json();
    assert.equal(
      response.status,
      status,
      `${method} ${endpoint}: ${value.error || response.status}`,
    );
    return { response, value };
  }
  await api("admin", { status: 401 });
  await api("admin/manage/routes", {
    method: "PUT",
    body: { revision: 1, record: route },
    status: 401,
  });
  await api("session", {
    method: "POST",
    body: { password },
    headers: { Origin: "https://wrong.invalid" },
    status: 403,
  });
  const login = await api("session", { method: "POST", body: { password } });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  assert(login.response.headers.get("set-cookie").includes("HttpOnly"));
  let admin = (await api("admin", { admin: true })).value;
  assert.equal(admin.storage, "development-mock");
  assert.equal(admin.config.manual.length, 51);
  assert.equal(admin.integrations.email.mode, "preview");
  pass(
    "Authenticated admin APIs, origin protection, HttpOnly sessions and operation without PostgreSQL credentials",
  );
  const catalogue = (await api("catalogue")).value;
  assert.equal(catalogue.persistent, false);
  assert(!catalogue.enabledTripTypes.includes("local"));
  assert(catalogue.routes.every((r) => r.status === "active"));
  const search = (await api("search", { method: "POST", body: { journey } }))
    .value;
  assert.equal(search.route.source, "demo");
  assert(search.routingWarning.includes("Development"));
  assert.equal(search.fare.total, 3440);
  assert(search.options.every((v) => v.development));
  await api("quote", {
    method: "POST",
    body: { journey: { ...journey, departure: "2020-01-01T10:00" } },
    status: 400,
  });
  await api("search", {
    method: "POST",
    body: { journey: { passengers: 2 } },
    status: 400,
  });
  pass(
    "Configuration-driven customer search, labelled demo road data, dynamic vehicle fares and invalid-date/input handling",
  );
  async function create(j = journey) {
    ipSequence++;
    const token = randomBytes(32).toString("hex");
    const payload = {
      journey: j,
      customer,
      requestKey: randomUUID(),
      accessToken: token,
      consent: true,
    };
    const value = (
      await api("bookings", { method: "POST", body: payload, status: 201 })
    ).value;
    return { booking: value.booking, token, payload };
  }
  const one = await create(),
    two = await create();
  assert(one.booking.development);
  assert(!("accessHash" in one.booking));
  assert.equal(one.booking.status, "REQUESTED");
  assert.equal(
    (await api("bookings", { method: "POST", body: one.payload, status: 201 }))
      .value.booking.id,
    one.booking.id,
  );
  await api("bookings/" + one.booking.id, { token: "invalid", status: 403 });
  admin = (await api("admin", { admin: true })).value;
  assert(admin.operations.notifications.length >= 4);
  assert(
    admin.operations.notifications.every(
      (n) => n.status === "preview" && n.attempts === 0,
    ),
  );
  pass(
    "Unique private development bookings, idempotent submissions and safe email preview outbox with zero SMTP sends",
  );
  const op = async (entry, body, status = 200) =>
    (
      await api("admin/bookings/" + entry.booking.id, {
        method: "PATCH",
        body,
        admin: true,
        status,
      })
    ).value.booking;
  const quote = async (entry, amount) =>
    op(entry, {
      action: "quote",
      amount,
      inclusions: "Vehicle, fuel and driver included",
      exclusions: "Tolls and parking extra",
    });
  const accept = async (entry, version, status = 200) =>
    (
      await api("bookings/" + entry.booking.id, {
        method: "PATCH",
        token: entry.token,
        body: { action: "accept", version },
        status,
      })
    ).value.booking;
  await op(one, { action: "confirm" }, 409);
  let b = await quote(one, 3500);
  await accept(one, "stale", 409);
  await accept(one, b.fare.version);
  b = await quote(one, 3600);
  await op(one, { action: "confirm" }, 409);
  await accept(one, b.fare.version);
  await op(one, { action: "confirm" });
  b = await quote(two, 3500);
  await accept(two, b.fare.version);
  await op(two, { action: "confirm" });
  await op(
    one,
    {
      action: "assign",
      driverId: "demo-driver-2",
      vehicleId: "demo-vehicle-0",
    },
    409,
  );
  await op(
    one,
    {
      action: "assign",
      driverId: "demo-driver-1",
      vehicleId: "demo-vehicle-1",
    },
    409,
  );
  await op(one, {
    action: "assign",
    driverId: "demo-driver-1",
    vehicleId: "demo-vehicle-0",
  });
  await op(
    two,
    {
      action: "assign",
      driverId: "demo-driver-1",
      vehicleId: "demo-vehicle-0",
    },
    409,
  );
  await op(two, { action: "cancel", reason: "Fixture cancellation" });
  pass(
    "Quote acceptance/re-quote protection, valid booking transitions and registered driver/vehicle conflict validation",
  );
  await op(one, {
    action: "payment",
    amount: 100,
    type: "receipt",
    method: "UPI",
    reference: "fixture-receipt",
    note: "Manual development record",
  });
  await op(
    one,
    {
      action: "payment",
      amount: 100,
      type: "receipt",
      method: "UPI",
      reference: "fixture-receipt",
      note: "Duplicate",
    },
    409,
  );
  const pending = (
    await api("payments/bookings/" + one.booking.id, {
      method: "POST",
      token: one.token,
      body: {},
      status: 201,
    })
  ).value.attempt;
  assert.equal(pending.status, "PENDING");
  const failBody = {
    attemptId: pending.id,
    result: "failure",
    eventId: randomUUID(),
  };
  await api("payments/bookings/" + one.booking.id, {
    method: "PATCH",
    token: one.token,
    body: failBody,
  });
  const next = (
    await api("payments/bookings/" + one.booking.id, {
      method: "POST",
      token: one.token,
      body: {},
      status: 201,
    })
  ).value.attempt;
  const successBody = {
    attemptId: next.id,
    result: "success",
    eventId: randomUUID(),
  };
  await api("payments/bookings/" + one.booking.id, {
    method: "PATCH",
    token: one.token,
    body: successBody,
  });
  await api("payments/bookings/" + one.booking.id, {
    method: "PATCH",
    token: one.token,
    body: successBody,
  });
  b = (await api("bookings/" + one.booking.id, { token: one.token })).value
    .booking;
  assert.equal(b.status, "ASSIGNED");
  assert.equal(b.payments.length, 2);
  await api("payments/bookings/" + one.booking.id, {
    method: "PATCH",
    token: one.token,
    body: { attemptId: next.id, result: "refund", eventId: randomUUID() },
  });
  await op(
    one,
    {
      action: "payment",
      amount: 1000,
      type: "refund",
      method: "UPI",
      reference: "excess-refund",
      note: "Should fail",
    },
    400,
  );
  await op(one, { action: "start" });
  assert.equal((await op(one, { action: "complete" })).status, "COMPLETED");
  pass(
    "Pending, failed, successful and refunded mock payments; duplicate callback protection; payment and booking state separation",
  );
  await api("payments/razorpay/verify", {
    method: "POST",
    body: {
      orderId: "order_fixture",
      paymentId: "payment_fixture",
      signature: "invalid",
    },
    status: 401,
  });
  await api("payments/razorpay/verify", {
    method: "POST",
    body: { orderId: "order_fixture", paymentId: "payment_fixture", signature },
    status: 503,
  });
  const wh = await fetch(origin + "/api/cab/payments/razorpay/webhook", {
    method: "POST",
    headers: { "x-razorpay-signature": webhookSignature },
    body: raw,
  });
  assert.equal(wh.status, 503);
  pass(
    "Live Razorpay callbacks/webhooks require valid signatures and remain disabled without persistent storage",
  );
  admin = (await api("admin", { admin: true })).value;
  const draft = {
    ...structuredClone(route),
    id: randomUUID(),
    name: "Fixture managed route",
    status: "draft",
  };
  const save = async (kind, record, status = 200, revision) => {
    const current = (await api("admin", { admin: true })).value;
    return (
      await api("admin/manage/" + kind, {
        method: "PUT",
        admin: true,
        body: { revision: revision ?? current.operations.revision, record },
        status,
      })
    ).value;
  };
  await save("routes", draft);
  assert(!(await api("catalogue")).value.routes.some((r) => r.id === draft.id));
  await api("quote", {
    method: "POST",
    body: { journey: { ...journey, routeId: draft.id } },
    status: 409,
  });
  const resolved = (
    await api("admin/resolve-route", {
      method: "POST",
      admin: true,
      body: {
        origin: route.origin,
        destination: route.destination,
        roundTrip: true,
      },
    })
  ).value.route;
  assert.equal(resolved.source, "demo");
  assert(resolved.returnDistanceKm > 0);
  const active = {
    ...draft,
    status: "active",
    fares: {
      ...draft.fares,
      sedan: {
        ...manual,
        discount: { enabled: false, type: "fixed", value: 0 },
      },
    },
  };
  await save("routes", active);
  assert((await api("catalogue")).value.routes.some((r) => r.id === draft.id));
  const preview = (
    await api("admin/preview-fare", {
      method: "POST",
      admin: true,
      body: { route: active, journey },
    })
  ).value.fare;
  assert.equal(preview.total, 3400);
  await save("routes", { ...active, status: "inactive" });
  assert(!(await api("catalogue")).value.routes.some((r) => r.id === draft.id));
  const stale = (await api("admin", { admin: true })).value.operations.revision;
  await save("settings", {
    ...operations.settings,
    fixedAdditionalCharge: 300,
  });
  await save("settings", operations.settings, 409, stale);
  pass(
    "Route draft/activate/deactivate workflow, road resolution, shared admin fare preview and revision protection",
  );
  const newVehicle = {
    ...operations.vehicles[0],
    id: randomUUID(),
    name: "Fixture managed hatchback",
    category: "hatchback",
    registration: "DEMO-NEW-01",
    active: false,
  };
  await save("vehicles", newVehicle);
  await save("vehicles", { ...newVehicle, id: randomUUID() }, 409);
  const driver = {
    ...operations.drivers[0],
    id: randomUUID(),
    name: "Fixture managed driver",
    phone: "9000000011",
    active: false,
  };
  await save("drivers", driver);
  await save("drivers", { ...driver, id: randomUUID() }, 409);
  await save("vehicles", { ...newVehicle, seats: -1 }, 400);
  await save(
    "settings",
    { ...operations.settings, fixedAdditionalCharge: -250 },
    400,
  );
  pass(
    "Vehicle/driver create/edit, registration/phone uniqueness and invalid configuration protection",
  );
  const localRoute = {
    ...draft,
    id: randomUUID(),
    name: "Fixture hourly rental",
    origin: route.origin,
    destination: route.origin,
    tripTypes: ["local"],
    status: "active",
    categories: ["sedan"],
    fares: { sedan: hourly },
    roundTripFares: {},
    distanceKm: null,
    durationMinutes: null,
    distanceSource: "unverified",
  };
  await save("routes", localRoute);
  const current = (await api("admin", { admin: true })).value.operations
    .settings;
  await save("settings", {
    ...current,
    enabledTripTypes: [...current.enabledTripTypes, "local"],
  });
  const localQuote = (
    await api("quote", {
      method: "POST",
      body: {
        journey: {
          ...journey,
          tripType: "local",
          origin: route.origin,
          destination: route.origin,
          routeId: localRoute.id,
          packageId: "four",
        },
      },
    })
  ).value;
  assert.equal(localQuote.fare.total, 1300);
  assert.equal(localQuote.journey.durationHours, 4);
  const missing = {
    ...journey,
    routeId: "",
    destination: {
      id: "gaya",
      label: "Gaya",
      city: "Gaya",
      lat: 24.7914,
      lon: 85.0002,
    },
  };
  const fallback = (
    await api("quote", { method: "POST", body: { journey: missing } })
  ).value;
  assert.equal(fallback.route, null);
  assert.equal(fallback.fare.total, null);
  pass(
    "Enabled hourly package flow and unavailable routing fallback to a custom quote without a guessed distance",
  );
  const roundBooking = await create(roundJourney);
  assert.equal(roundBooking.booking.route.returnDistanceKm, 225);
  const airport = (await api("catalogue")).value.routes.find((r) =>
    r.tripTypes.includes("airport"),
  );
  await create({
    ...journey,
    tripType: "airport",
    origin: airport.origin,
    destination: airport.destination,
    routeId: airport.id,
    flightNumber: "6E123",
  });
  pass("Round-trip and airport booking review with required customer details");
  admin = (await api("admin", { admin: true })).value;
  assert(admin.operations.notifications.every((n) => n.status === "preview"));
  assert(
    admin.operations.notifications.some((n) => n.kind === "payment-failure"),
  );
  assert(!JSON.stringify(admin.integrations).includes(password));
  await api("session", { method: "DELETE", admin: true });
  await api("admin", { admin: true, status: 401 });
  pass(
    "Email rendering stays safe/unsent, credentials are not exposed and logout revokes server access",
  );
  if (process.argv.includes("--browser")) {
    const { checkCabSystemBrowser } =
      await import("./check-cab-system-browser.mjs");
    report.browser = await checkCabSystemBrowser({ origin, password });
  }
} catch (error) {
  report.errors.push(error.stack || String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  child?.kill();
  await writeFile(
    "artifacts/cab-system/verification.json",
    JSON.stringify(report, null, 2),
  );
  await writeFile("artifacts/cab-system/server.log", serverLog);
  console.log(
    `${checks.length} check groups completed. Report: artifacts/cab-system/verification.json`,
  );
}
