CREATE TABLE IF NOT EXISTS admin_password_resets (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_admin_password_reset_user (user_id),
  KEY ix_admin_password_reset_expiry (expires_at),
  CONSTRAINT fk_admin_password_reset_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
