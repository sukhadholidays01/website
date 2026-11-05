import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDatabasePool } from "@/lib/db";
import type {
  CabOperationsData,
  CabSettings,
  FarePolicy,
  ManagedDriver,
  ManagedRoute,
  ManagedVehicle,
  NotificationLog,
  PaymentAttempt,
} from "./models";
import type {
  CabBooking,
  CabConfig,
  CabEvent,
  CabPayment,
  CabStatus,
  CabState,
  CabVehicle,
} from "./types";
import type { CabRepository } from "./repository";

type DbRow = RowDataPacket & Record<string, unknown>;

const defaultSettings = (): CabSettings => ({
  enabledTripTypes: ["one-way", "round-trip", "airport", "custom"],
  fixedAdditionalCharge: 0,
  assignmentBufferMinutes: 30,
  bookingPolicy:
    "This is a request, not a confirmed ride. Operations must confirm the fare, vehicle availability and booking before travel.",
  notifications: { customer: false, admin: false },
  mockPaymentsEnabled: false,
});

const emptyConfig = (): CabConfig => ({
  revision: 1,
  manual: [],
  automatic: [],
});

const emptyOperations = (): CabOperationsData => ({
  revision: 1,
  routes: [],
  vehicles: [],
  drivers: [],
  settings: defaultSettings(),
  paymentAttempts: [],
  notifications: [],
});

function json<T>(value: unknown, fallback?: T): T {
  if (value === null || value === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error("Required MySQL JSON value is missing.");
  }
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }
  throw new Error("MySQL returned an invalid timestamp.");
}

function dbDate(value: string): Date {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()))
    throw new Error("Cannot persist an invalid timestamp.");
  return parsed;
}

function tripDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}:00+05:30`);
  if (!Number.isFinite(parsed.getTime()))
    throw new Error("Cannot persist an invalid trip time.");
  return parsed;
}

function settingsPayload(state: CabState) {
  return [
    ["cab_config", state.config, false],
    ["cab_operations_settings", state.operations.settings, false],
    ["cab_operations_revision", state.operations.revision, false],
  ] as const;
}

async function loadState(connection: PoolConnection): Promise<CabState> {
  const [settingsRows] = await connection.query<DbRow[]>(
    "SELECT setting_key, setting_value FROM website_settings WHERE setting_key IN (?, ?, ?)",
    ["cab_config", "cab_operations_settings", "cab_operations_revision"],
  );
  const settings = new Map(
    settingsRows.map((row) => [
      String(row.setting_key),
      row.setting_value,
    ]),
  );
  const config = settings.has("cab_config")
    ? json<CabConfig>(settings.get("cab_config"))
    : emptyConfig();
  const operations = emptyOperations();
  if (settings.has("cab_operations_settings"))
    operations.settings = json<CabSettings>(
      settings.get("cab_operations_settings"),
    );
  if (settings.has("cab_operations_revision"))
    operations.revision = Number(
      json<number>(settings.get("cab_operations_revision")),
    );

  const [routeRows] = await connection.query<DbRow[]>(
    "SELECT route_id, route_payload FROM cab_routes ORDER BY route_id",
  );
  const routes = new Map<string, ManagedRoute>();
  for (const row of routeRows) {
    const route = json<ManagedRoute>(row.route_payload);
    route.fares = {};
    route.roundTripFares = {};
    routes.set(String(row.route_id), route);
  }
  const [fareRows] = await connection.query<DbRow[]>(
    "SELECT route_id, category_id, trip_type, policy_payload FROM fare_configurations WHERE is_active = TRUE ORDER BY route_id, category_id",
  );
  for (const row of fareRows) {
    const route = routes.get(String(row.route_id));
    if (!route) continue;
    const category = String(row.category_id) as CabVehicle;
    const policy = json<FarePolicy>(row.policy_payload);
    if (row.trip_type === "round-trip") {
      route.roundTripFares ||= {};
      route.roundTripFares[category] = policy;
    } else {
      route.fares[category] = policy;
    }
  }
  operations.routes = [...routes.values()];

  const [vehicleRows] = await connection.query<DbRow[]>(
    "SELECT vehicle_payload FROM vehicles ORDER BY vehicle_id",
  );
  operations.vehicles = vehicleRows.map((row) =>
    json<ManagedVehicle>(row.vehicle_payload),
  );

  const [driverRows] = await connection.query<DbRow[]>(
    "SELECT driver_payload FROM drivers ORDER BY driver_id",
  );
  operations.drivers = driverRows.map((row) =>
    json<ManagedDriver>(row.driver_payload),
  );

  const [bookingRows] = await connection.query<DbRow[]>(
    `SELECT b.*, c.full_name, c.phone, c.email
     FROM bookings b
     JOIN customers c ON c.customer_id = b.customer_id
     ORDER BY b.created_at DESC`,
  );
  const [historyRows] = await connection.query<DbRow[]>(
    "SELECT booking_id, actor_type, message, status_from, status_to, created_at FROM booking_status_history ORDER BY booking_id, event_sequence",
  );
  const historyByBooking = new Map<string, CabEvent[]>();
  for (const row of historyRows) {
    const id = String(row.booking_id);
    const events = historyByBooking.get(id) || [];
    events.push({
      at: iso(row.created_at),
      actor: String(row.actor_type) as CabEvent["actor"],
      message: String(row.message),
      ...(row.status_from
        ? { statusFrom: String(row.status_from) as CabStatus }
        : {}),
      ...(row.status_to ? { statusTo: String(row.status_to) as CabStatus } : {}),
    });
    historyByBooking.set(id, events);
  }
  const [paymentRows] = await connection.query<DbRow[]>(
    "SELECT payment_id, booking_id, amount, payment_type, method, reference, note, payment_mode, paid_at FROM payments ORDER BY paid_at",
  );
  const paymentsByBooking = new Map<string, CabPayment[]>();
  for (const row of paymentRows) {
    const id = String(row.booking_id);
    const payments = paymentsByBooking.get(id) || [];
    payments.push({
      id: String(row.payment_id),
      amount: Number(row.amount),
      type: String(row.payment_type) as CabPayment["type"],
      method: String(row.method),
      reference: String(row.reference),
      note: String(row.note),
      at: iso(row.paid_at),
      mode: String(row.payment_mode) as CabPayment["mode"],
    });
    paymentsByBooking.set(id, payments);
  }
  const bookings: CabBooking[] = bookingRows.map((row) => ({
    id: String(row.booking_id),
    customerId: String(row.customer_id),
    accessHash: String(row.access_token_hash),
    requestKey: String(row.request_key),
    requestHash: String(row.request_hash),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    journey: json(row.journey_snapshot),
    route: json(row.route_snapshot, null),
    fare: json(row.fare_snapshot),
    status: String(row.booking_status) as CabBooking["status"],
    ...(row.accepted_version
      ? { acceptedVersion: String(row.accepted_version) }
      : {}),
    customer: {
      name: String(row.full_name),
      phone: String(row.phone),
      email: String(row.email),
      notes: String(row.customer_notes),
    },
    ...(row.assignment_snapshot
      ? { assignment: json(row.assignment_snapshot) }
      : {}),
    payments: paymentsByBooking.get(String(row.booking_id)) || [],
    history: historyByBooking.get(String(row.booking_id)) || [],
    development: Boolean(row.development_flag),
  }));

  const [attemptRows] = await connection.query<DbRow[]>(
    "SELECT payment_attempt_id, booking_id, amount, amount_paise, currency, attempt_status, provider, order_id, provider_payment_id, event_ids, created_at, updated_at FROM payment_attempts ORDER BY created_at",
  );
  operations.paymentAttempts = attemptRows.map(
    (row): PaymentAttempt => ({
      id: String(row.payment_attempt_id),
      bookingId: String(row.booking_id),
      amount: Number(row.amount),
      amountPaise: Number(row.amount_paise),
      currency: String(row.currency) as PaymentAttempt["currency"],
      status: String(row.attempt_status) as PaymentAttempt["status"],
      provider: String(row.provider) as PaymentAttempt["provider"],
      orderId: String(row.order_id),
      ...(row.provider_payment_id
        ? { paymentId: String(row.provider_payment_id) }
        : {}),
      eventIds: json<string[]>(row.event_ids, []),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }),
  );

  const [notificationRows] = await connection.query<DbRow[]>(
    "SELECT notification_id, booking_id, notification_kind, audience, delivery_status, attempts, created_at, dedupe_key, subject, html_body, text_body, recipient, error_message FROM notifications ORDER BY created_at DESC",
  );
  operations.notifications = notificationRows.map(
    (row): NotificationLog => ({
      id: String(row.notification_id),
      bookingId: String(row.booking_id),
      kind: String(row.notification_kind) as NotificationLog["kind"],
      audience: String(row.audience) as NotificationLog["audience"],
      status: String(row.delivery_status) as NotificationLog["status"],
      attempts: Number(row.attempts),
      createdAt: iso(row.created_at),
      dedupeKey: String(row.dedupe_key),
      subject: String(row.subject),
      html: String(row.html_body),
      text: String(row.text_body),
      recipient: String(row.recipient),
      ...(row.error_message
        ? { error: String(row.error_message) }
        : {}),
    }),
  );

  const [limitRows] = await connection.query<DbRow[]>(
    "SELECT bucket_key, request_count, expires_at FROM cab_rate_limits",
  );
  const limits = Object.fromEntries(
    limitRows.map((row) => [
      String(row.bucket_key),
      {
        count: Number(row.request_count),
        until: new Date(iso(row.expires_at)).getTime(),
      },
    ]),
  );
  const [sessionRows] = await connection.query<DbRow[]>(
    "SELECT session_hash, expires_at FROM cab_admin_sessions",
  );
  const sessions = Object.fromEntries(
    sessionRows.map((row) => [
      String(row.session_hash),
      new Date(iso(row.expires_at)).getTime(),
    ]),
  );

  return { config, bookings, limits, sessions, operations };
}

async function persistSettings(
  connection: PoolConnection,
  state: CabState,
): Promise<void> {
  for (const [key, value, isPublic] of settingsPayload(state)) {
    await connection.execute(
      `INSERT INTO website_settings (setting_key, setting_value, is_public)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_public = VALUES(is_public)`,
      [key, JSON.stringify(value), isPublic],
    );
  }
}

async function persistOperations(
  connection: PoolConnection,
  state: CabState,
): Promise<void> {
  await persistSettings(connection, state);
  await connection.execute(
    "UPDATE fare_configurations SET is_active = FALSE WHERE is_active = TRUE",
  );

  for (const route of state.operations.routes) {
    const { fares, roundTripFares, ...routePayload } = route;
    await connection.execute(
      `INSERT INTO cab_routes
        (route_id, origin_place_id, destination_place_id, route_status, distance_km, return_distance_km, route_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE origin_place_id = VALUES(origin_place_id),
         destination_place_id = VALUES(destination_place_id), route_status = VALUES(route_status),
         distance_km = VALUES(distance_km), return_distance_km = VALUES(return_distance_km),
         route_payload = VALUES(route_payload)`,
      [
        route.id,
        route.origin.id,
        route.destination.id,
        route.status,
        route.distanceKm,
        route.returnDistanceKm,
        JSON.stringify(routePayload),
      ],
    );
    for (const [category, policy] of Object.entries(fares)) {
      if (!policy) continue;
      const fareTripTypes = route.tripTypes.filter(
        (tripType) => tripType !== "round-trip",
      );
      for (const tripType of fareTripTypes)
        await upsertFare(
          connection,
          route.id,
          category as CabVehicle,
          tripType,
          policy,
        );
    }
    for (const [category, policy] of Object.entries(roundTripFares || {})) {
      if (!policy) continue;
      await upsertFare(
        connection,
        route.id,
        category as CabVehicle,
        "round-trip",
        policy,
      );
    }
  }

  for (const vehicle of state.operations.vehicles) {
    await connection.execute(
      `INSERT INTO vehicles
        (vehicle_id, category_id, name, model, registration, seats, luggage, availability, is_active, route_ids, private_notes, vehicle_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE category_id = VALUES(category_id), name = VALUES(name),
         model = VALUES(model), registration = VALUES(registration), seats = VALUES(seats),
         luggage = VALUES(luggage), availability = VALUES(availability),
         is_active = VALUES(is_active), route_ids = VALUES(route_ids),
         private_notes = VALUES(private_notes), vehicle_payload = VALUES(vehicle_payload)`,
      [
        vehicle.id,
        vehicle.category,
        vehicle.name,
        vehicle.model,
        vehicle.registration || null,
        vehicle.seats,
        vehicle.luggage,
        vehicle.availability,
        vehicle.active,
        JSON.stringify(vehicle.routeIds),
        vehicle.notes,
        JSON.stringify(vehicle),
      ],
    );
  }

  for (const driver of state.operations.drivers) {
    await connection.execute(
      `INSERT INTO drivers
        (driver_id, name, phone, is_approved, is_active, availability, private_notes, driver_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone),
         is_approved = VALUES(is_approved), is_active = VALUES(is_active),
         availability = VALUES(availability), private_notes = VALUES(private_notes),
         driver_payload = VALUES(driver_payload)`,
      [
        driver.id,
        driver.name,
        driver.phone,
        driver.approved,
        driver.active,
        driver.availability,
        driver.notes,
        JSON.stringify(driver),
      ],
    );
  }
}

async function upsertFare(
  connection: PoolConnection,
  routeId: string,
  category: CabVehicle,
  tripType: string,
  policy: FarePolicy,
): Promise<void> {
  await connection.execute(
    `INSERT INTO fare_configurations
      (fare_configuration_id, route_id, category_id, trip_type, fare_mode, is_active,
       base_fare, per_km_rate, minimum_fare, driver_charge_per_day, policy_payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE fare_mode = VALUES(fare_mode), is_active = VALUES(is_active),
       base_fare = VALUES(base_fare), per_km_rate = VALUES(per_km_rate),
       minimum_fare = VALUES(minimum_fare), driver_charge_per_day = VALUES(driver_charge_per_day),
       policy_payload = VALUES(policy_payload)`,
    [
      randomUUID(),
      routeId,
      category,
      tripType,
      policy.mode,
      true,
      policy.baseFare,
      policy.perKm,
      policy.minimumFare,
      policy.driverPerDay,
      JSON.stringify(policy),
    ],
  );
}

async function persistBookings(
  connection: PoolConnection,
  state: CabState,
): Promise<void> {
  for (const booking of state.bookings) {
    const customerId = booking.customerId || randomUUID();
    booking.customerId = customerId;
    await connection.execute(
      `INSERT INTO customers (customer_id, full_name, phone, email)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone = VALUES(phone), email = VALUES(email)`,
      [
        customerId,
        booking.customer.name,
        booking.customer.phone,
        booking.customer.email,
      ],
    );
    await connection.execute(
      `INSERT INTO bookings
        (booking_id, booking_reference, request_key, request_hash, access_token_hash,
         customer_id, route_id, trip_type, vehicle_category, booking_status, departure_at,
         return_at, passenger_count, customer_notes, journey_snapshot, route_snapshot,
         fare_snapshot, accepted_version, assignment_snapshot, development_flag, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE booking_status = VALUES(booking_status),
         route_id = VALUES(route_id), departure_at = VALUES(departure_at),
         return_at = VALUES(return_at), passenger_count = VALUES(passenger_count),
         customer_notes = VALUES(customer_notes), journey_snapshot = VALUES(journey_snapshot),
         route_snapshot = VALUES(route_snapshot), fare_snapshot = VALUES(fare_snapshot),
         accepted_version = VALUES(accepted_version), assignment_snapshot = VALUES(assignment_snapshot),
         development_flag = VALUES(development_flag), updated_at = VALUES(updated_at)`,
      [
        booking.id,
        booking.id,
        booking.requestKey,
        booking.requestHash,
        booking.accessHash,
        customerId,
        booking.journey.routeId || null,
        booking.journey.tripType,
        booking.journey.vehicle,
        booking.status,
        tripDate(booking.journey.departure),
        tripDate(booking.journey.returnAt),
        booking.journey.passengers,
        booking.customer.notes,
        JSON.stringify(booking.journey),
        booking.route ? JSON.stringify(booking.route) : null,
        JSON.stringify(booking.fare),
        booking.acceptedVersion || null,
        booking.assignment ? JSON.stringify(booking.assignment) : null,
        Boolean(booking.development),
        dbDate(booking.createdAt),
        dbDate(booking.updatedAt),
      ],
    );
    await connection.execute(
      `INSERT INTO booking_passengers
        (passenger_id, booking_id, customer_id, passenger_type, is_primary)
       VALUES (?, ?, ?, 'adult', TRUE)
       ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)`,
      [randomUUID(), booking.id, customerId],
    );

    for (const [index, event] of booking.history.entries()) {
      await connection.execute(
        `INSERT INTO booking_status_history
          (event_id, booking_id, event_sequence, status_from, status_to, actor_type, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status_from = VALUES(status_from), status_to = VALUES(status_to),
           actor_type = VALUES(actor_type), message = VALUES(message), created_at = VALUES(created_at)`,
        [
          randomUUID(),
          booking.id,
          index,
          event.statusFrom || null,
          event.statusTo || null,
          event.actor,
          event.message,
          dbDate(event.at),
        ],
      );
    }

    for (const payment of booking.payments) {
      await connection.execute(
        `INSERT INTO payments
          (payment_id, booking_id, amount, payment_type, method, reference, note, payment_mode, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount), payment_type = VALUES(payment_type),
           method = VALUES(method), note = VALUES(note), payment_mode = VALUES(payment_mode),
           paid_at = VALUES(paid_at)`,
        [
          payment.id,
          booking.id,
          payment.amount,
          payment.type,
          payment.method,
          payment.reference,
          payment.note,
          payment.mode || "manual",
          dbDate(payment.at),
        ],
      );
    }

    if (!booking.route || booking.fare.total === null) {
      await connection.execute(
        `INSERT INTO cab_enquiries
          (enquiry_id, customer_id, booking_id, enquiry_type, enquiry_status, payload, created_at, updated_at)
         VALUES (?, ?, ?, 'cab_quote', 'requested', ?, ?, ?)
         ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = VALUES(updated_at)`,
        [
          randomUUID(),
          customerId,
          booking.id,
          JSON.stringify(booking.journey),
          dbDate(booking.createdAt),
          dbDate(booking.updatedAt),
        ],
      );
    }
  }
}

async function persistNotifications(
  connection: PoolConnection,
  notifications: NotificationLog[],
): Promise<void> {
  for (const notification of notifications) {
    await connection.execute(
      `INSERT INTO notifications
        (notification_id, booking_id, notification_kind, audience, delivery_status,
         attempts, created_at, dedupe_key, subject, html_body, text_body, recipient, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE delivery_status = VALUES(delivery_status),
         attempts = VALUES(attempts), subject = VALUES(subject), html_body = VALUES(html_body),
         text_body = VALUES(text_body), recipient = VALUES(recipient),
         error_message = VALUES(error_message)`,
      [
        notification.id,
        notification.bookingId || null,
        notification.kind,
        notification.audience,
        notification.status,
        notification.attempts,
        dbDate(notification.createdAt),
        notification.dedupeKey,
        notification.subject,
        notification.html,
        notification.text,
        notification.recipient,
        notification.error || null,
      ],
    );
  }
}

async function persistPaymentAttempts(
  connection: PoolConnection,
  attempts: PaymentAttempt[],
): Promise<void> {
  for (const attempt of attempts) {
    await connection.execute(
      `INSERT INTO payment_attempts
        (payment_attempt_id, booking_id, amount, amount_paise, currency, attempt_status,
         provider, order_id, provider_payment_id, event_ids, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), amount_paise = VALUES(amount_paise),
         attempt_status = VALUES(attempt_status), provider_payment_id = VALUES(provider_payment_id),
         event_ids = VALUES(event_ids), updated_at = VALUES(updated_at)`,
      [
        attempt.id,
        attempt.bookingId,
        attempt.amount,
        attempt.amountPaise,
        attempt.currency,
        attempt.status,
        attempt.provider,
        attempt.orderId,
        attempt.paymentId || null,
        JSON.stringify(attempt.eventIds),
        dbDate(attempt.createdAt),
        dbDate(attempt.updatedAt),
      ],
    );
  }
}

async function persistLimitsAndSessions(
  connection: PoolConnection,
  state: CabState,
): Promise<void> {
  await connection.execute(
    "DELETE FROM cab_rate_limits WHERE expires_at < UTC_TIMESTAMP(3)",
  );
  await connection.execute(
    "DELETE FROM cab_admin_sessions WHERE expires_at < UTC_TIMESTAMP(3)",
  );
  for (const [key, limit] of Object.entries(state.limits)) {
    await connection.execute(
      `INSERT INTO cab_rate_limits (bucket_key, request_count, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE request_count = VALUES(request_count), expires_at = VALUES(expires_at)`,
      [key, limit.count, new Date(limit.until)],
    );
  }
  for (const [key, expiry] of Object.entries(state.sessions || {})) {
    await connection.execute(
      `INSERT INTO cab_admin_sessions (session_hash, expires_at)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)`,
      [key, new Date(expiry)],
    );
  }
}

export const mysqlCabRepository: CabRepository = {
  mode: "mysql",
  persistent: true,
  async read() {
    const connection = await getDatabasePool().getConnection();
    try {
      await connection.beginTransaction();
      const state = await loadState(connection);
      await connection.commit();
      return state;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
  async transaction<T>(operation: (draft: CabState) => T): Promise<T> {
    const connection = await getDatabasePool().getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        "SELECT lock_id FROM cab_state_lock WHERE lock_id = 1 FOR UPDATE",
      );
      const draft = await loadState(connection);
      const result = operation(draft);
      await persistOperations(connection, draft);
      await persistBookings(connection, draft);
      await persistPaymentAttempts(
        connection,
        draft.operations.paymentAttempts,
      );
      await persistNotifications(
        connection,
        draft.operations.notifications,
      );
      await persistLimitsAndSessions(connection, draft);
      await connection.execute(
        "UPDATE cab_state_lock SET revision = revision + 1 WHERE lock_id = 1",
      );
      await connection.commit();
      return structuredClone(result);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

export async function mysqlCabCategories() {
  const [rows] = await getDatabasePool().query<DbRow[]>(
    `SELECT category_id, display_name, request_capacity
     FROM cab_categories WHERE is_enabled = TRUE ORDER BY sort_order, category_id`,
  );
  return rows.map((row) => ({
    category: String(row.category_id) as CabVehicle,
    name: String(row.display_name),
    seats: Number(row.request_capacity),
  }));
}
