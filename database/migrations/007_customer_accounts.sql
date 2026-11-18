CREATE TABLE IF NOT EXISTS customer_accounts (
  account_id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at DATETIME(3) NULL,
  phone VARCHAR(24) NULL,
  account_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  verification_requested_at DATETIME(3) NULL,
  terms_accepted_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  UNIQUE KEY uq_customer_accounts_email (email),
  KEY ix_customer_accounts_verified_created (email_verified,created_at),
  CONSTRAINT ck_customer_account_status CHECK (account_status IN ('ACTIVE','SUSPENDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS customer_verification_tokens (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_customer_verification_account (account_id),
  KEY ix_customer_verification_expiry (expires_at),
  CONSTRAINT fk_customer_verification_account FOREIGN KEY (account_id) REFERENCES customer_accounts(account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS customer_sessions (
  session_hash CHAR(64) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_customer_sessions_account (account_id),
  KEY ix_customer_sessions_expiry (expires_at),
  CONSTRAINT fk_customer_session_account FOREIGN KEY (account_id) REFERENCES customer_accounts(account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id VARCHAR(100) NOT NULL,
  user_id CHAR(36) NOT NULL,
  read_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (notification_id,user_id),
  KEY ix_notification_reads_staff (user_id,read_at),
  CONSTRAINT fk_notification_read_item FOREIGN KEY (notification_id) REFERENCES notifications(notification_id),
  CONSTRAINT fk_notification_read_staff FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
