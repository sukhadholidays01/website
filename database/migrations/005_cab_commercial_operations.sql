CREATE TABLE IF NOT EXISTS cab_booking_commercial (
  booking_id VARCHAR(80) NOT NULL PRIMARY KEY,
  commercial_payload JSON NOT NULL,
  CONSTRAINT fk_commercial_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_payment_context (
  payment_attempt_id VARCHAR(100) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL,
  context_payload JSON NOT NULL,
  KEY ix_payment_context_booking (booking_id),
  CONSTRAINT fk_context_attempt FOREIGN KEY (payment_attempt_id) REFERENCES payment_attempts(payment_attempt_id),
  CONSTRAINT fk_context_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
