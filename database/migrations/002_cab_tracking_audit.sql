CREATE TABLE IF NOT EXISTS cab_driver_sessions (
  session_hash CHAR(64) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL,
  driver_id VARCHAR(100) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_driver_session_booking (booking_id, expires_at),
  CONSTRAINT fk_driver_session_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  CONSTRAINT fk_driver_session_driver FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_booking_locations (
  booking_id VARCHAR(80) NOT NULL PRIMARY KEY,
  driver_id VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy_metres DECIMAL(10,2) NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  CONSTRAINT ck_cab_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT ck_cab_longitude CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT fk_location_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  CONSTRAINT fk_location_driver FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_audit_log (
  event_id CHAR(36) NOT NULL PRIMARY KEY,
  actor_role VARCHAR(24) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY ix_cab_audit_entity (entity_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_refund_requests (
  request_id CHAR(36) NOT NULL PRIMARY KEY,
  payment_attempt_id VARCHAR(100) NOT NULL,
  provider_refund_id VARCHAR(100) NULL,
  status VARCHAR(24) NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_cab_refund_attempt (payment_attempt_id),
  UNIQUE KEY uq_cab_refund_provider (provider_refund_id),
  CONSTRAINT fk_refund_attempt FOREIGN KEY (payment_attempt_id) REFERENCES payment_attempts(payment_attempt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
