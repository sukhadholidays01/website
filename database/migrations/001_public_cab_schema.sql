CREATE TABLE IF NOT EXISTS cab_state_lock (
  lock_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO cab_state_lock (lock_id, revision) VALUES (1, 1);

CREATE TABLE IF NOT EXISTS users (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS customers (
  customer_id CHAR(36) NOT NULL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(24) NOT NULL,
  email VARCHAR(190) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_customers_phone (phone),
  KEY ix_customers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_categories (
  category_id VARCHAR(40) NOT NULL PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  request_capacity SMALLINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id VARCHAR(100) NOT NULL PRIMARY KEY,
  category_id VARCHAR(40) NOT NULL,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(150) NOT NULL,
  registration VARCHAR(32) NULL,
  seats SMALLINT UNSIGNED NOT NULL,
  luggage SMALLINT UNSIGNED NULL,
  availability VARCHAR(24) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  route_ids JSON NOT NULL,
  private_notes VARCHAR(1000) NOT NULL,
  vehicle_payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_vehicles_registration (registration),
  KEY ix_vehicles_category_status (category_id, is_active, availability),
  CONSTRAINT fk_vehicles_category FOREIGN KEY (category_id) REFERENCES cab_categories (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS drivers (
  driver_id VARCHAR(100) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(24) NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  availability VARCHAR(24) NOT NULL,
  private_notes VARCHAR(1000) NOT NULL,
  driver_payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_drivers_phone (phone),
  KEY ix_drivers_status (is_active, is_approved, availability)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_routes (
  route_id VARCHAR(100) NOT NULL PRIMARY KEY,
  origin_place_id VARCHAR(100) NOT NULL,
  destination_place_id VARCHAR(100) NOT NULL,
  route_status VARCHAR(24) NOT NULL,
  distance_km DECIMAL(10,2) NULL,
  return_distance_km DECIMAL(10,2) NULL,
  route_payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_cab_routes_status_pair (route_status, origin_place_id, destination_place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fare_configurations (
  fare_configuration_id CHAR(36) NOT NULL PRIMARY KEY,
  route_id VARCHAR(100) NOT NULL,
  category_id VARCHAR(40) NOT NULL,
  trip_type VARCHAR(24) NOT NULL,
  fare_mode VARCHAR(24) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  base_fare DECIMAL(12,2) NULL,
  per_km_rate DECIMAL(10,2) NULL,
  minimum_fare DECIMAL(12,2) NULL,
  driver_charge_per_day DECIMAL(10,2) NULL,
  policy_payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_fare_route_category_trip (route_id, category_id, trip_type),
  KEY ix_fare_active_route (route_id, is_active),
  CONSTRAINT fk_fare_route FOREIGN KEY (route_id) REFERENCES cab_routes (route_id),
  CONSTRAINT fk_fare_category FOREIGN KEY (category_id) REFERENCES cab_categories (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bookings (
  booking_id VARCHAR(80) NOT NULL PRIMARY KEY,
  booking_reference VARCHAR(48) NOT NULL,
  request_key CHAR(36) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  access_token_hash CHAR(64) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  route_id VARCHAR(100) NULL,
  trip_type VARCHAR(24) NOT NULL,
  vehicle_category VARCHAR(40) NOT NULL,
  booking_status VARCHAR(24) NOT NULL,
  departure_at DATETIME(3) NOT NULL,
  return_at DATETIME(3) NULL,
  passenger_count SMALLINT UNSIGNED NOT NULL,
  customer_notes VARCHAR(1500) NOT NULL,
  journey_snapshot JSON NOT NULL,
  route_snapshot JSON NULL,
  fare_snapshot JSON NOT NULL,
  accepted_version VARCHAR(100) NULL,
  assignment_snapshot JSON NULL,
  development_flag BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_bookings_reference (booking_reference),
  UNIQUE KEY uq_bookings_request_key (request_key),
  KEY ix_bookings_status_departure (booking_status, departure_at),
  KEY ix_bookings_customer_created (customer_id, created_at),
  KEY ix_bookings_route_departure (route_id, departure_at),
  CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES customers (customer_id),
  CONSTRAINT fk_bookings_route FOREIGN KEY (route_id) REFERENCES cab_routes (route_id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_category FOREIGN KEY (vehicle_category) REFERENCES cab_categories (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS booking_passengers (
  passenger_id CHAR(36) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  passenger_type VARCHAR(24) NOT NULL DEFAULT 'adult',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_booking_passenger_customer (booking_id, customer_id),
  KEY ix_booking_passengers_customer (customer_id),
  CONSTRAINT fk_booking_passengers_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
  CONSTRAINT fk_booking_passengers_customer FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS booking_status_history (
  event_id CHAR(36) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL,
  event_sequence INT UNSIGNED NOT NULL,
  status_from VARCHAR(24) NULL,
  status_to VARCHAR(24) NULL,
  actor_type VARCHAR(24) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_booking_history_sequence (booking_id, event_sequence),
  KEY ix_booking_history_order (booking_id, created_at),
  CONSTRAINT fk_booking_history_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS payments (
  payment_id CHAR(36) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_type VARCHAR(16) NOT NULL,
  method VARCHAR(40) NOT NULL,
  reference VARCHAR(120) NOT NULL,
  note VARCHAR(1000) NOT NULL,
  payment_mode VARCHAR(16) NOT NULL DEFAULT 'manual',
  paid_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_payments_reference (booking_id, reference),
  KEY ix_payments_booking_date (booking_id, paid_at),
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS payment_attempts (
  payment_attempt_id VARCHAR(100) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL,
  attempt_status VARCHAR(24) NOT NULL,
  provider VARCHAR(24) NOT NULL,
  order_id VARCHAR(100) NOT NULL,
  provider_payment_id VARCHAR(100) NULL,
  event_ids JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_payment_attempt_order (order_id),
  UNIQUE KEY uq_payment_attempt_provider_payment (provider_payment_id),
  KEY ix_payment_attempts_booking (booking_id, created_at),
  CONSTRAINT fk_payment_attempts_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_enquiries (
  enquiry_id CHAR(36) NOT NULL PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  booking_id VARCHAR(80) NULL,
  enquiry_type VARCHAR(40) NOT NULL,
  enquiry_status VARCHAR(24) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_cab_enquiries_booking (booking_id),
  KEY ix_cab_enquiries_status_created (enquiry_status, created_at),
  CONSTRAINT fk_cab_enquiries_customer FOREIGN KEY (customer_id) REFERENCES customers (customer_id),
  CONSTRAINT fk_cab_enquiries_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id VARCHAR(100) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NULL,
  notification_kind VARCHAR(32) NOT NULL,
  audience VARCHAR(16) NOT NULL,
  delivery_status VARCHAR(24) NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  dedupe_key VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_body MEDIUMTEXT NOT NULL,
  text_body MEDIUMTEXT NOT NULL,
  recipient VARCHAR(190) NOT NULL,
  error_message VARCHAR(500) NULL,
  UNIQUE KEY uq_notifications_dedupe (dedupe_key),
  KEY ix_notifications_status_created (delivery_status, created_at),
  CONSTRAINT fk_notifications_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reviews (
  review_id CHAR(36) NOT NULL PRIMARY KEY,
  customer_id CHAR(36) NULL,
  display_name VARCHAR(100) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  review_text VARCHAR(2000) NOT NULL,
  consent BOOLEAN NOT NULL DEFAULT FALSE,
  review_status VARCHAR(24) NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_reviews_public_status (review_status, created_at),
  CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES customers (customer_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS website_settings (
  setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value JSON NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_admin_sessions (
  session_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_cab_admin_sessions_expiry (expires_at),
  CONSTRAINT fk_cab_admin_sessions_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_rate_limits (
  bucket_key CHAR(64) NOT NULL PRIMARY KEY,
  request_count INT UNSIGNED NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  KEY ix_cab_rate_limits_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO cab_categories (category_id, display_name, request_capacity, sort_order, is_enabled) VALUES
  ('hatchback', 'Hatchback', 4, 1, TRUE),
  ('sedan', 'Sedan', 4, 2, TRUE),
  ('suv', 'SUV / MPV', 6, 3, TRUE),
  ('premium-mpv', 'Premium MPV', 6, 4, TRUE),
  ('luxury', 'Premium vehicle', 4, 5, TRUE),
  ('tempo-traveller', 'Tempo Traveller', 12, 6, TRUE);
