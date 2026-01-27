-- Authentication Schema Update for Scholarship Tracking System
-- Add User and Session management tables

-- ============================================
-- USER MODEL (Admin/Staff Authentication)
-- ============================================
CREATE TABLE "users" (
  "user_id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) UNIQUE NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "first_name" VARCHAR(100) NOT NULL,
  "last_name" VARCHAR(100) NOT NULL,
  "role" VARCHAR(20) NOT NULL DEFAULT 'STAFF', -- ADMIN, STAFF, VIEWER
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED
  "last_login" TIMESTAMP,
  "password_changed_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "failed_login_attempts" INTEGER DEFAULT 0,
  "locked_until" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SESSION MODEL (Session Management)
-- ============================================
CREATE TABLE "sessions" (
  "session_id" VARCHAR(255) PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "ip_address" INET,
  "user_agent" TEXT
);

-- ============================================
-- AUDIT LOG MODEL (Security Tracking)
-- ============================================
CREATE TABLE "audit_logs" (
  "log_id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "users"("user_id") ON DELETE SET NULL,
  "action" VARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, CREATE_STUDENT, UPDATE_SCHOLARSHIP, etc.
  "resource_type" VARCHAR(50), -- STUDENT, SCHOLARSHIP, USER
  "resource_id" INTEGER,
  "details" JSONB,
  "ip_address" INET,
  "user_agent" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX "idx_users_username" ON "users"("username");
CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_status" ON "users"("status");
CREATE INDEX "idx_sessions_user_id" ON "sessions"("user_id");
CREATE INDEX "idx_sessions_expires_at" ON "sessions"("expires_at");
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- ============================================
-- DEFAULT ADMIN USER (Change password immediately)
-- ============================================
INSERT INTO "users" (
  "username", 
  "email", 
  "password_hash", 
  "first_name", 
  "last_name", 
  "role"
) VALUES (
  'admin',
  'admin@scholarship.edu',
  '$2b$12$LQv3c1yqBwlVHpPjrEyLa.4F8/YQnckioc2ZWGd1hjh98k2PmHm4i', -- password: admin123 (CHANGE THIS!)
  'System',
  'Administrator',
  'ADMIN'
);