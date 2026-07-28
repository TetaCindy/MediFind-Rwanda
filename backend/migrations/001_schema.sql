-- ============================================================
--  MediFind Rwanda — Database Schema
--  Version: 1.0  |  Created: 2026
--  Run with: psql -U medifind_user -d medifind_rwanda -f 001_schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable PostGIS for geo queries (proximity search)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
--  TABLE 1: users
--  Stores both patients and system admins.
--  Facility staff are stored separately in facility_staff.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone         VARCHAR(20)   UNIQUE NOT NULL,
  email         VARCHAR(255)  UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  full_name     VARCHAR(150)  NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'patient'
                              CHECK (role IN ('patient', 'admin')),
  language      VARCHAR(5)    NOT NULL DEFAULT 'en'
                              CHECK (language IN ('en', 'kin')),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
--  TABLE 2: facilities
--  Pharmacies, health centers, hospitals registered on the platform.
-- ============================================================
CREATE TABLE IF NOT EXISTS facilities (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200)  NOT NULL,
  type            VARCHAR(50)   NOT NULL
                                CHECK (type IN ('Pharmacy','Health Center','Hospital','Clinic')),
  license_number  VARCHAR(100)  UNIQUE NOT NULL,
  district        VARCHAR(100)  NOT NULL,
  address         TEXT          NOT NULL,
  phone           VARCHAR(20)   NOT NULL,
  operating_hours VARCHAR(200),
  -- PostGIS point for proximity queries (longitude, latitude)
  location        GEOGRAPHY(POINT, 4326),
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','active','inactive','rejected')),
  approved_by     UUID          REFERENCES users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Spatial index for fast proximity queries
CREATE INDEX IF NOT EXISTS idx_facilities_location
  ON facilities USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_facilities_status
  ON facilities (status);

-- ============================================================
--  TABLE 3: facility_staff
--  Staff accounts belonging to a specific facility.
-- ============================================================
CREATE TABLE IF NOT EXISTS facility_staff (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id   UUID          NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  phone         VARCHAR(20)   UNIQUE NOT NULL,
  email         VARCHAR(255)  UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  full_name     VARCHAR(150)  NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'staff'
                              CHECK (role IN ('admin', 'staff')),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facility_staff_facility
  ON facility_staff (facility_id);

-- ============================================================
--  TABLE 4: drugs
--  Master list of all medicines on the platform.
--  Managed by system admins only.
-- ============================================================
CREATE TABLE IF NOT EXISTS drugs (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en         VARCHAR(200)  NOT NULL,
  name_kin        VARCHAR(200),                 -- Kinyarwanda name if available
  category        VARCHAR(100)  NOT NULL,
  unit            VARCHAR(50)   NOT NULL,       -- tabs, caps, sachets, inhalers, etc.
  description     TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Full-text search index on drug names (supports bilingual search)
CREATE INDEX IF NOT EXISTS idx_drugs_name_en
  ON drugs USING GIN (to_tsvector('english', name_en));

CREATE INDEX IF NOT EXISTS idx_drugs_category
  ON drugs (category);

-- ============================================================
--  TABLE 5: inventory
--  The core table — each row = one drug at one facility.
--  Updated throughout the day by facility staff.
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id     UUID          NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  drug_id         UUID          NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  quantity        INTEGER       NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_threshold   INTEGER       NOT NULL DEFAULT 10 CHECK (low_threshold >= 0),
  -- Computed status: in_stock / low_stock / out_of_stock
  status          VARCHAR(20)   NOT NULL DEFAULT 'out_of_stock'
                                CHECK (status IN ('in_stock','low_stock','out_of_stock')),
  last_updated_by UUID          REFERENCES facility_staff(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- One row per drug per facility
  UNIQUE (facility_id, drug_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_facility
  ON inventory (facility_id);

CREATE INDEX IF NOT EXISTS idx_inventory_drug
  ON inventory (drug_id);

CREATE INDEX IF NOT EXISTS idx_inventory_status
  ON inventory (status);

-- Auto-compute status whenever quantity or threshold changes
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity = 0 THEN
    NEW.status := 'out_of_stock';
  ELSIF NEW.quantity <= NEW.low_threshold THEN
    NEW.status := 'low_stock';
  ELSE
    NEW.status := 'in_stock';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_status
  BEFORE INSERT OR UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_inventory_status();

-- ============================================================
--  TABLE 6: inventory_audit_log
--  Every stock change is recorded here. NFR 15 compliance.
--  Retained for minimum 12 months.
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_audit_log (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id    UUID          NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  facility_id     UUID          NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  drug_id         UUID          NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  staff_id        UUID          REFERENCES facility_staff(id) ON DELETE SET NULL,
  prev_quantity   INTEGER       NOT NULL,
  new_quantity    INTEGER       NOT NULL,
  prev_status     VARCHAR(20)   NOT NULL,
  new_status      VARCHAR(20)   NOT NULL,
  note            TEXT,
  changed_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_facility
  ON inventory_audit_log (facility_id);

CREATE INDEX IF NOT EXISTS idx_audit_drug
  ON inventory_audit_log (drug_id);

CREATE INDEX IF NOT EXISTS idx_audit_changed_at
  ON inventory_audit_log (changed_at DESC);

-- ============================================================
--  TABLE 7: watch_list
--  Patients watching out-of-stock drugs to get notified.
-- ============================================================
CREATE TABLE IF NOT EXISTS watch_list (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drug_id         UUID          NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  radius_km       INTEGER       NOT NULL DEFAULT 5 CHECK (radius_km IN (2,3,5,10)),
  -- Last known location of the patient for proximity alerts
  user_lat        DECIMAL(10,7),
  user_lng        DECIMAL(10,7),
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- One watch per drug per user
  UNIQUE (user_id, drug_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_drug
  ON watch_list (drug_id, is_active);

-- ============================================================
--  TABLE 8: notifications
--  Log of all SMS and push notifications sent.
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_type  VARCHAR(20)   NOT NULL CHECK (recipient_type IN ('patient','facility')),
  recipient_id    UUID          NOT NULL,   -- user_id or facility_id
  type            VARCHAR(50)   NOT NULL,   -- 'low_stock', 'available', 'welcome', etc.
  channel         VARCHAR(20)   NOT NULL CHECK (channel IN ('sms','push','in_app')),
  message         TEXT          NOT NULL,
  drug_id         UUID          REFERENCES drugs(id) ON DELETE SET NULL,
  facility_id     UUID          REFERENCES facilities(id) ON DELETE SET NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','sent','failed')),
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient
  ON notifications (recipient_id, recipient_type);

-- ============================================================
--  TABLE 9: otp_codes
--  One-time passwords for phone verification and password reset.
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone           VARCHAR(20)   NOT NULL,
  code            VARCHAR(6)    NOT NULL,
  purpose         VARCHAR(30)   NOT NULL CHECK (purpose IN ('registration','password_reset')),
  is_used         BOOLEAN       NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone
  ON otp_codes (phone, is_used);

-- ============================================================
--  AUTO-UPDATE updated_at on all main tables
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_facilities_updated_at
  BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_facility_staff_updated_at
  BEFORE UPDATE ON facility_staff FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_drugs_updated_at
  BEFORE UPDATE ON drugs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
