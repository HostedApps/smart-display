-- Migration: Add token_expires_at column for auth token expiry (SEC-C4)
-- This column stores when the auth token expires. Tokens older than this are rejected.

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expires_at DATETIME DEFAULT NULL AFTER auth_token;

-- Index for efficient expired token cleanup
CREATE INDEX IF NOT EXISTS idx_users_token_expires ON users (token_expires_at);
