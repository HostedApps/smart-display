-- Track when a display's own settings change, so kiosks can detect a new
-- published layout via the lightweight emergency poll (instant publish).
ALTER TABLE displays ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
