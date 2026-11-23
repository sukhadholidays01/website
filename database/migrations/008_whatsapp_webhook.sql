CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  conversation_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  phone_number_id VARCHAR(64) NOT NULL,
  sender_wa_id VARCHAR(24) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  enquiry_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_whatsapp_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_whatsapp_enquiry FOREIGN KEY (enquiry_id) REFERENCES cab_enquiries(enquiry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS whatsapp_events (
  event_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  event_kind VARCHAR(16) NOT NULL,
  phone_number_id VARCHAR(64) NOT NULL,
  message_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conversation_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  event_timestamp BIGINT UNSIGNED NOT NULL,
  details JSON NOT NULL,
  received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_whatsapp_message (message_id),
  KEY ix_whatsapp_conversation (conversation_key, received_at),
  CONSTRAINT fk_whatsapp_conversation FOREIGN KEY (conversation_key) REFERENCES whatsapp_conversations(conversation_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
