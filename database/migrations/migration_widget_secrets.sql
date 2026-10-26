-- Widget secrets (API keys, tokens, auth headers) stored encrypted, outside widgets.config_json,
-- so they never appear in display configs, kiosk offline caches, version history or exports.
-- See backend-api/widget_secrets_lib.php. Without this table secrets stay in config as before.
CREATE TABLE IF NOT EXISTS widget_secrets (
    widget_id INT NOT NULL,
    field VARCHAR(40) NOT NULL,
    ciphertext TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (widget_id, field),
    CONSTRAINT fk_widget_secrets_widget FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE
) ENGINE=InnoDB;
