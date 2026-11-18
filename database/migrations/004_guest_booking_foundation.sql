CREATE TABLE IF NOT EXISTS cab_guest_state (
  booking_id VARCHAR(80) NOT NULL PRIMARY KEY,
  original_link_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  original_link_expires_at DATETIME(3) NOT NULL,
  document_policy JSON NOT NULL,
  admin_id_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_guest_state_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_guest_grants (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL,
  grant_kind VARCHAR(12) NOT NULL,
  assurance VARCHAR(8) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_guest_grant_booking (booking_id,grant_kind,revoked),
  KEY ix_guest_grant_expiry (expires_at),
  CONSTRAINT ck_guest_grant_kind CHECK (grant_kind IN ('link','session')),
  CONSTRAINT ck_guest_grant_assurance CHECK (assurance IN ('link','otp')),
  CONSTRAINT fk_guest_grant_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_guest_otps (
  challenge_id CHAR(36) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL,
  phone_hash CHAR(64) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME(3) NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_guest_otp_booking (booking_id,created_at),
  KEY ix_guest_otp_phone (phone_hash,created_at),
  KEY ix_guest_otp_expiry (expires_at),
  CONSTRAINT fk_guest_otp_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_policy_versions (
  policy_id VARCHAR(64) NOT NULL,
  policy_version VARCHAR(40) NOT NULL,
  category VARCHAR(40) NOT NULL,
  policy_text TEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (policy_id,policy_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_booking_consents (
  acceptance_id CHAR(36) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  policy_id VARCHAR(64) NOT NULL,
  policy_version VARCHAR(40) NOT NULL,
  category VARCHAR(40) NOT NULL,
  content_hash CHAR(64) NOT NULL,
  source_context VARCHAR(100) NOT NULL,
  accepted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_booking_policy_acceptance (booking_id,policy_id,policy_version),
  KEY ix_booking_consent_customer (customer_id,accepted_at),
  CONSTRAINT fk_consent_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  CONSTRAINT fk_consent_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_consent_policy FOREIGN KEY (policy_id,policy_version) REFERENCES cab_policy_versions(policy_id,policy_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cab_private_documents (
  document_id CHAR(36) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(80) NOT NULL,
  storage_key CHAR(64) NOT NULL,
  document_type VARCHAR(40) NOT NULL,
  mime_type VARCHAR(40) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  content_hash CHAR(64) NOT NULL,
  review_status VARCHAR(16) NOT NULL,
  rejection_reason VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  reviewed_at DATETIME(3) NULL,
  delete_after DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_private_storage_key (storage_key),
  KEY ix_private_document_booking (booking_id,review_status),
  KEY ix_private_document_retention (delete_after,deleted_at),
  CONSTRAINT ck_document_review CHECK (review_status IN ('pending','approved','rejected','superseded','deleted')),
  CONSTRAINT fk_private_document_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
